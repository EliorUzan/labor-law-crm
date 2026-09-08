// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import postgres from "postgres";
import { getMatterDetail } from "./queries";

const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));

// Execute the real history query over CTE fixtures; never insert application data.
describe.skipIf(process.env.CRM_READONLY_DB_TEST !== "1")("PostgreSQL Case History (read-only)", () => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const clientId = "22222222-2222-4222-8222-222222222222";
  const matterId = "33333333-3333-4333-8333-333333333333";
  const other = "44444444-4444-4444-8444-444444444444";
  let connection: ReturnType<typeof postgres>;
  let clientOwner: string;
  let matterOwner: string;

  beforeAll(() => {
    if (!process.env.DATABASE_URL) process.loadEnvFile(".env.local");
    connection = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, connect_timeout: 10,
      connection: { default_transaction_read_only: true } });
    mocks.database.mockReturnValue(drizzle(async (sql, params) => {
      // Parent query ownership is covered separately; these tests exercise the
      // actual history joins, filtering and PostgreSQL chronological ordering.
      if (sql.includes('from "matter_notes"')) return { rows: [] };
      if (!sql.includes('from "matter_history"')) return { rows: [[matterId, ...Array(20).fill(null)]] };
      const fixtures = `with
        clients(id, owner_user_id) as (values ('${clientId}'::uuid, '${clientOwner}'::uuid)),
        matters(id, owner_user_id, client_id) as (values ('${matterId}'::uuid, '${matterOwner}'::uuid, '${clientId}'::uuid)),
        matter_history(id, owner_user_id, matter_id, event_date, title, description, created_at) as (values
          ('00000000-0000-4000-8000-000000000001'::uuid, '${owner}'::uuid, '${matterId}'::uuid, '2026-08-28'::date, 'entered later', null::text, '2026-09-08'::timestamptz),
          ('00000000-0000-4000-8000-000000000002'::uuid, '${owner}'::uuid, '${matterId}'::uuid, '2026-09-07'::date, 'latest event', 'description', '2026-09-07'::timestamptz),
          ('00000000-0000-4000-8000-000000000003'::uuid, '${other}'::uuid, '${matterId}'::uuid, '2026-09-09'::date, 'other owner', null::text, '2026-09-09'::timestamptz),
          ('00000000-0000-4000-8000-000000000004'::uuid, '${owner}'::uuid, '${other}'::uuid, '2026-09-10'::date, 'other matter', null::text, '2026-09-10'::timestamptz))`;
      return { rows: await connection.unsafe(`${fixtures} ${sql}`, params as string[]).values() };
    }));
  });
  afterAll(async () => { await connection?.end({ timeout: 1 }); });

  it("orders by event date despite opposite insertion order and excludes other owners/Matters", async () => {
    clientOwner = owner; matterOwner = owner;
    const result = await getMatterDetail(owner, matterId);
    expect(result?.history.map((entry) => entry.eventDate)).toEqual(["2026-08-28", "2026-09-07"]);
    expect(result?.history.map((entry) => entry.description)).toEqual([null, "description"]);
  });
  it("requires Client ownership even when a history row has the session owner", async () => {
    clientOwner = other; matterOwner = owner;
    expect((await getMatterDetail(owner, matterId))?.history).toEqual([]);
  });
  it("requires Matter ownership even when a history row has the session owner", async () => {
    clientOwner = owner; matterOwner = other;
    expect((await getMatterDetail(owner, matterId))?.history).toEqual([]);
  });
});
