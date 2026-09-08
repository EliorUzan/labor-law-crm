import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { getClient, getClientDetail, listClients, ownsClientMatter } from "./queries";
import { getFinancialSummary } from "./financial-summary";
import { getDashboardData } from "@/modules/dashboard/queries";

const mock = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mock.database }));
const owner = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const matterId = "33333333-3333-4333-8333-333333333333";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();

beforeEach(() => {
  execute.mockReset().mockResolvedValue({ rows: [] });
  mock.database.mockReturnValue(drizzle(execute));
});

describe("owner-scoped reads", () => {
  it("does not query malformed IDs or load children of an inaccessible client", async () => {
    expect(await getClient(owner, "invalid")).toBeNull();
    expect(execute).not.toHaveBeenCalled();
    expect(await getClientDetail(owner, clientId)).toBeNull();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toContain('"clients"."owner_user_id" =');
    expect(execute.mock.calls[0][1]).toEqual([owner, clientId, 1]);
  });
  it("searches with bound parameters and literal SQL wildcard characters", async () => {
    await listClients(owner, "שם%_\\");
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('"clients"."owner_user_id" =');
    expect(sql).toContain("ilike");
    expect(params).toEqual([owner, "%שם\\%\\_\\\\%"]);
    expect(sql).not.toContain("שם");
  });
  it("rejects unknown clients and Matters outside the selected client", async () => {
    expect(await ownsClientMatter(owner, clientId, matterId)).toBe(false);
    execute.mockResolvedValueOnce({ rows: [[clientId]] }).mockResolvedValueOnce({ rows: [] });
    expect(await ownsClientMatter(owner, clientId, matterId)).toBe(false);
    const [sql, params] = execute.mock.calls.at(-1)!;
    expect(sql).toContain('"matters"."owner_user_id" =');
    expect(sql).toContain('"matters"."client_id" =');
    expect(params).toEqual([owner, clientId, matterId, 1]);
  });
  it("scopes every client child read and orders financial history by record date descending", async () => {
    execute.mockResolvedValueOnce({ rows: [[clientId]] });
    await getClientDetail(owner, clientId);
    expect(execute).toHaveBeenCalledTimes(5);
    for (const [sql, params] of execute.mock.calls) {
      expect(sql).toContain('"owner_user_id" =');
      expect(params).toContain(owner);
      expect(params).toContain(clientId);
    }
    expect(execute.mock.calls.find(([sql]) => sql.includes('order by "financial_records"'))?.[0])
      .toContain('order by "financial_records"."record_date" desc');
  });
});

describe("shared Dashboard aggregation", () => {
  it("retains exact decimals returned by Postgres", async () => {
    execute.mockResolvedValueOnce({ rows: [["1000000000000.01", "0.02", "999999999999.99", "0.02"]] });
    const summary = await getFinancialSummary(owner, clientId, new Date("2026-12-31T22:30:00Z"));
    expect(summary.outstandingAmount).toBe("999999999999.99");
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain("in ('fee', 'charge')");
    expect(sql).toContain('else -"amount"');
    expect(params).toEqual(["2027-01-01", "2027-02-01", owner, clientId]);
  });
  it("uses the shared totals, owner-scoped joins, and only open obligations on the Dashboard", async () => {
    await getDashboardData(owner);
    expect(execute).toHaveBeenCalledTimes(6);
    for (const [, params] of execute.mock.calls) expect(params).toContain(owner);
    const [sql, params] = execute.mock.calls.find(([sql]) => sql.includes('from "client_obligations"'))!;
    expect(sql).toContain('"client_obligations"."done" =');
    expect(sql).toContain('"clients"."owner_user_id" =');
    expect(params).toContain(false);
    expect(execute.mock.calls.filter(([sql]) => sql.includes('from "financial_records"'))).toHaveLength(1);
  });
});
