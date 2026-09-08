import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { getMatterDeadline, getMatterWork } from "./queries";
import { getDashboardData } from "@/modules/dashboard/queries";

const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("@/modules/clients/financial-summary", () => ({ getFinancialSummary: async () => ({ outstandingAmount: "0", paymentsReceivedThisMonth: "0" }) }));
const owner = "11111111-1111-4111-8111-111111111111";
const matterId = "33333333-3333-4333-8333-333333333333";
const recordId = "44444444-4444-4444-8444-444444444444";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
beforeEach(() => {
  execute.mockReset().mockResolvedValue({ rows: [] });
  mocks.database.mockReturnValue(drizzle(execute));
});

describe("owned work queries", () => {
  it("does not query invalid IDs", async () => {
    expect(await getMatterDeadline(owner, matterId, "invalid")).toBeNull();
    expect(await getMatterWork(owner, "invalid")).toEqual({ tasks: [], deadlines: [], importantDates: [], obligations: [] });
    expect(execute).not.toHaveBeenCalled();
  });
  it("validates a Deadline through its Matter and Client", async () => {
    expect(await getMatterDeadline(owner, matterId, recordId)).toBeNull();
    const [sql, params] = execute.mock.calls[0];
    for (const table of ["deadlines", "matters", "clients"]) expect(sql).toContain(`"${table}"."owner_user_id" =`);
    expect(sql).toContain('"deadlines"."matter_id" =');
    expect(sql).toContain('"deadlines"."id" =');
    expect(params).toEqual([owner, owner, owner, matterId, recordId, 1]);
  });
  it("loads all historical dates, orders chronologically, and joins current same-Matter task Deadlines", async () => {
    await getMatterWork(owner, matterId);
    expect(execute).toHaveBeenCalledTimes(4);
    for (const table of ["tasks", "deadlines", "important_dates"]) {
      const [sql, params] = execute.mock.calls.find(([sql]) => sql.includes(`from "${table}"`))!;
      for (const owned of [table, "matters", "clients"]) expect(sql).toContain(`"${owned}"."owner_user_id" =`);
      expect(sql).toContain(`"${table}"."matter_id" =`);
      expect(params).toContain(matterId);
      expect(sql).not.toContain(" limit ");
      if (table === "tasks") {
        expect(sql).toContain('"deadlines"."matter_id" = "tasks"."matter_id"');
        expect(sql).toContain('"deadlines"."deadline_at" asc nulls last');
        expect(sql).toContain('order by "tasks"."done" asc');
      } else {
        expect(sql).toContain(`order by "${table}"."${table === "deadlines" ? "deadline_at" : "event_at"}" asc`);
        expect(sql).not.toMatch(/"\w+_at" [<>]/);
      }
    }
  });
  it("Dashboard scopes all work through owned parents and filters/sorts before limiting", async () => {
    await getDashboardData(owner);
    const workCalls = execute.mock.calls.filter(([sql]) => /from "(tasks|deadlines|important_dates)"/.test(sql));
    expect(workCalls).toHaveLength(4);
    for (const [sql, params] of workCalls) {
      expect(sql).toContain('"clients"."owner_user_id" =');
      expect(sql).toContain('"matters"."owner_user_id" =');
      expect(params).toContain(owner);
    }
    const [taskSql, taskParams] = workCalls.find(([sql]) => sql.includes('from "tasks"'))!;
    expect(taskSql).toContain('"tasks"."done" =');
    expect(taskParams).toContain(false);
    expect(taskSql).toContain('"deadlines"."deadline_at" asc nulls last');
    expect(taskSql).toContain('"deadlines"."matter_id" = "tasks"."matter_id"');
    const [dateSql] = workCalls.find(([sql]) => sql.includes('from "important_dates"'))!;
    expect(dateSql).toContain('"important_dates"."event_at" >=');
    const deadlineSql = workCalls.filter(([sql]) => sql.includes('from "deadlines"')).map(([sql]) => sql);
    expect(deadlineSql[0]).toContain('"deadlines"."deadline_at" <');
    expect(deadlineSql[1]).toContain('"deadlines"."deadline_at" >=');
    for (const sql of deadlineSql) expect(sql).not.toContain('join "tasks"');
  });
  it("scopes reverse obligation references through Client, Matter and Deadline", async () => {
    await getMatterWork(owner, matterId);
    const [sql, params] = execute.mock.calls.find(([sql]) => sql.includes('from "client_obligations"'))!;
    for (const table of ["client_obligations", "matters", "clients", "deadlines"]) expect(sql).toContain(`"${table}"."owner_user_id" =`);
    expect(sql).toContain('"matters"."client_id" = "client_obligations"."client_id"');
    expect(sql).toContain('"matters"."id" = "deadlines"."matter_id"');
    expect(params).toContain(matterId);
  });
  it("classifies standalone deadlines and returns current Task association data", async () => {
    execute.mockImplementation(async (sql) => {
      if (sql.includes('from "deadlines"')) return { rows: sql.includes('"deadline_at" <')
        ? [[recordId, matterId, "עבר", "תיק", "2000-01-01T12:00:00Z"]]
        : [["future", matterId, "עתידי", "תיק", "2099-01-01T12:00:00Z"]] };
      if (sql.includes('from "tasks"')) return { rows: [[recordId, matterId, "משימה", "תיק", "עתידי", "2099-01-01T12:00:00Z"]] };
      return { rows: [] };
    });
    const data = await getDashboardData(owner);
    expect(data.deadlines.map((row) => row.isOverdue)).toEqual([true, false]);
    expect(data.tasks[0].deadlineAt).toEqual(new Date("2099-01-01T12:00:00Z"));
    expect(data.tasks[0].matterId).toBe(matterId);
  });
});
