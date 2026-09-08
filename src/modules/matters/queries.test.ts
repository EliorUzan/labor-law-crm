import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { getMatter, getMatterDetail } from "./queries";
import { getDashboardData } from "@/modules/dashboard/queries";

const mock = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mock.database }));
const owner = "11111111-1111-4111-8111-111111111111";
const matterId = "33333333-3333-4333-8333-333333333333";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
beforeEach(() => {
  execute.mockReset().mockResolvedValue({ rows: [] });
  mock.database.mockReturnValue(drizzle(execute));
});

describe("Matter reads", () => {
  it("does not query invalid IDs or load history for an unavailable Matter", async () => {
    expect(await getMatter(owner, "invalid")).toBeNull();
    expect(execute).not.toHaveBeenCalled();
    expect(await getMatterDetail(owner, matterId)).toBeNull();
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('"clients"."owner_user_id" =');
    expect(sql).toContain('"matters"."owner_user_id" =');
    expect(sql).toContain('"clients"."id" = "matters"."client_id"');
    expect(params).toEqual([owner, matterId, owner, 1]);
  });
  it("scopes history through Matter and Client and orders primarily by event date ascending", async () => {
    execute.mockResolvedValueOnce({ rows: [[matterId, ...Array(20).fill(null)]] });
    await getMatterDetail(owner, matterId);
    const [sql, params] = execute.mock.calls.find(([query]) => query.includes('from "matter_history"'))!;
    for (const table of ["clients", "matters", "matter_history"]) expect(sql).toContain(`"${table}"."owner_user_id" =`);
    expect(sql).toContain('"matter_history"."matter_id" =');
    expect(params).toEqual([owner, owner, owner, matterId]);
    expect(sql).toContain('order by "matter_history"."event_date" asc, "matter_history"."created_at" asc');
  });
  it("scopes notes through Matter and Client and orders new notes first", async () => {
    execute.mockResolvedValueOnce({ rows: [[matterId, ...Array(20).fill(null)]] });
    await getMatterDetail(owner, matterId);
    const [sql, params] = execute.mock.calls.find(([query]) => query.includes('from "matter_notes"'))!;
    for (const table of ["clients", "matters", "matter_notes"]) expect(sql).toContain(`"${table}"."owner_user_id" =`);
    expect(sql).toContain('"matter_notes"."matter_id" =');
    expect(params).toEqual([owner, owner, owner, matterId]);
    expect(sql).toContain('order by "matter_notes"."created_at" desc, "matter_notes"."id" desc');
  });
  it("returns navigable recent Matters ordered by updated_at", async () => {
    await getDashboardData(owner);
    const [sql, params] = execute.mock.calls.find(([sql]) => sql.includes('from "matters"'))!;
    expect(sql).toContain('select "matters"."id"');
    expect(sql).toContain('order by "matters"."updated_at" desc');
    expect(params).toEqual([owner, owner, 8]);
  });
});
