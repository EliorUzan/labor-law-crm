// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import postgres from "postgres";
import { getFinancialSummary } from "./financial-summary";

const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));

// Opt-in check against real PostgreSQL. CTEs shadow the table for each SELECT;
// the connection also enforces read-only transactions. No legal/test records are inserted.
describe.skipIf(process.env.CRM_READONLY_DB_TEST !== "1")("PostgreSQL financial arithmetic (read-only)", () => {
  let connection: ReturnType<typeof postgres>;
  const owner = "11111111-1111-4111-8111-111111111111";
  const clientId = "22222222-2222-4222-8222-222222222222";
  const otherClient = "33333333-3333-4333-8333-333333333333";
  const otherOwner = "44444444-4444-4444-8444-444444444444";
  const now = new Date("2026-09-08T12:00:00Z");
  let fixture: string;

  beforeAll(() => {
    if (!process.env.DATABASE_URL) process.loadEnvFile(".env.local");
    connection = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, connect_timeout: 10,
      connection: { default_transaction_read_only: true } });
    mocks.database.mockReturnValue(drizzle(async (sql, params) => ({
      rows: await connection.unsafe(`with financial_records(owner_user_id, client_id, type, amount, record_date) as (${fixture}) ${sql}`, params as string[]).values(),
    })));
  });
  afterAll(async () => { await connection?.end({ timeout: 1 }); });

  it("calculates charges minus payments, scopes both IDs and honors month boundaries", async () => {
    fixture = `values
      ('${owner}'::uuid, '${clientId}'::uuid, 'fee', 12000.10::numeric, '2026-09-01'::date),
      ('${owner}'::uuid, '${clientId}'::uuid, 'charge', 2.20::numeric, '2026-09-01'::date),
      ('${owner}'::uuid, '${clientId}'::uuid, 'payment', 8000.30::numeric, '2026-09-30'::date),
      ('${owner}'::uuid, '${clientId}'::uuid, 'payment', 0.10::numeric, '2026-08-31'::date),
      ('${owner}'::uuid, '${clientId}'::uuid, 'payment', 0.20::numeric, '2026-10-01'::date),
      ('${owner}'::uuid, '${otherClient}'::uuid, 'charge', 5.00::numeric, '2026-09-01'::date),
      ('${otherOwner}'::uuid, '${clientId}'::uuid, 'charge', 900.00::numeric, '2026-09-01'::date)`;
    expect(await getFinancialSummary(owner, clientId, now)).toEqual({
      totalCharges: "12002.30", totalPayments: "8000.60", outstandingAmount: "4001.70", paymentsReceivedThisMonth: "8000.30",
    });
    expect((await getFinancialSummary(owner, undefined, now)).outstandingAmount).toBe("4006.70");
  });
  it("returns zero for no rows and preserves a credit smaller than one shekel", async () => {
    fixture = `select '${owner}'::uuid, '${clientId}'::uuid, 'payment', 0.01::numeric, '2026-09-01'::date`;
    expect((await getFinancialSummary(owner, clientId, now)).outstandingAmount).toBe("-0.01");
    expect(await getFinancialSummary(otherOwner, clientId, now)).toEqual({
      totalCharges: "0", totalPayments: "0", outstandingAmount: "0", paymentsReceivedThisMonth: "0",
    });
  });
  it("sums multiple maximum-sized records without JavaScript precision loss", async () => {
    fixture = `values
      ('${owner}'::uuid, '${clientId}'::uuid, 'fee', 999999999999.99::numeric, '2026-09-01'::date),
      ('${owner}'::uuid, '${clientId}'::uuid, 'charge', 999999999999.99::numeric, '2026-09-01'::date),
      ('${owner}'::uuid, '${clientId}'::uuid, 'payment', 0.01::numeric, '2026-09-01'::date)`;
    expect((await getFinancialSummary(owner, clientId, now)).outstandingAmount).toBe("1999999999999.97");
  });
});
