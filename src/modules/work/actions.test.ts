import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { saveTask, saveDeadline, saveImportantDate, setTaskDone } from "./actions";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), database: vi.fn(), matter: vi.fn(), deadline: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: mocks.auth }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("@/modules/matters/queries", () => ({ getMatter: mocks.matter }));
vi.mock("./queries", () => ({ getMatterDeadline: mocks.deadline }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const owner = "11111111-1111-4111-8111-111111111111";
const matterId = "33333333-3333-4333-8333-333333333333";
const recordId = "44444444-4444-4444-8444-444444444444";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
const form = (values: Record<string, string> = {}) => {
  const result = new FormData();
  for (const [key, value] of Object.entries({ title: "כותרת", ...values })) result.set(key, value);
  return result;
};
const cases = [
  { save: saveTask, table: "tasks", values: {} },
  { save: saveDeadline, table: "deadlines", values: { deadlineDate: "2026-09-14" } },
  { save: saveImportantDate, table: "important_dates", values: { eventAt: "2026-09-14T12:00" } },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(owner);
  mocks.matter.mockResolvedValue({ matter: { id: matterId }, client: { id: "client" } });
  mocks.deadline.mockResolvedValue({ id: recordId });
  execute.mockReset().mockResolvedValue({ rows: [[recordId]] });
  mocks.database.mockReturnValue(drizzle(execute));
});

describe("work mutations", () => {
  it.each(cases)("creates $table using verified ownership and minimal fields", async ({ save, table, values }) => {
    const result = await save(matterId, null, {}, form({ ...values, matterId: "forged", ownerUserId: "forged", done: "true", dueDate: "2026-09-15" }));
    expect(result.success).toBeTruthy();
    expect(mocks.auth).toHaveBeenCalled();
    expect(mocks.matter).toHaveBeenCalledWith(owner, matterId);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain(`insert into "${table}"`);
    expect(params).toEqual(expect.arrayContaining([owner, matterId, "כותרת"]));
    expect(params).not.toContain("forged");
    expect(sql).not.toContain('"due_date"');
    if (table === "tasks") { expect(params).toContain(false); expect(mocks.deadline).not.toHaveBeenCalled(); }
    expect(mocks.revalidate.mock.calls).toEqual([[`/matters/${matterId}`], ["/"], ...(table === "deadlines" ? [["/clients/client"]] : [])]);
  });
  it.each(cases)("refuses $table writes without owned parent", async ({ save, values }) => {
    mocks.matter.mockResolvedValue(null);
    for (const id of [null, recordId]) expect((await save(matterId, id, {}, form(values))).error).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it.each(cases)("scopes $table edits by record, Matter, and owner", async ({ save, table, values }) => {
    execute.mockResolvedValue({ rows: [] });
    expect((await save(matterId, recordId, {}, form(values))).error).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    for (const column of ["id", "matter_id", "owner_user_id"]) expect(sql).toContain(`"${table}"."${column}" =`);
    expect(params).toEqual(expect.arrayContaining([recordId, matterId, owner]));
    expect(sql.split(" where ")[0]).not.toMatch(/"(matter_id|owner_user_id)" =/);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("accepts a same-Matter Deadline and rejects an unavailable/other-Matter Deadline on create and edit", async () => {
    expect((await saveTask(matterId, null, {}, form({ deadlineId: recordId }))).success).toBeTruthy();
    expect(mocks.deadline).toHaveBeenCalledWith(owner, matterId, recordId);
    expect(execute.mock.calls[0][1]).toContain(recordId);
    execute.mockClear(); mocks.deadline.mockResolvedValue(null);
    for (const id of [null, recordId]) expect((await saveTask(matterId, id, {}, form({ deadlineId: recordId }))).error).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
  });
  it("allows multiple Tasks to pair, switch, and unpair without touching the Deadline", async () => {
    for (let n = 0; n < 2; n++) expect((await saveTask(matterId, null, {}, form({ deadlineId: recordId }))).success).toBeTruthy();
    const anotherDeadline = "55555555-5555-4555-8555-555555555555";
    expect((await saveTask(matterId, recordId, {}, form({ deadlineId: anotherDeadline }))).success).toBeTruthy();
    expect(execute.mock.calls.at(-1)![1]).toContain(anotherDeadline);
    expect((await saveTask(matterId, recordId, {}, form({ deadlineId: "" }))).success).toBeTruthy();
    expect(execute.mock.calls.at(-1)![1]).toContain(null);
    for (const [sql] of execute.mock.calls) expect(sql).not.toMatch(/(update|delete from) "deadlines"/);
  });
  it("creates a standalone no-description Deadline while saving a Task when requested", async () => {
    const result = await saveTask(matterId, null, {}, form({ createDeadline: "true", newDeadlineTitle: "מועד הגשה", newDeadlineDate: "2026-09-14" }));
    expect(result.success).toBeTruthy();
    expect(execute.mock.calls[0][0]).toContain('insert into "deadlines"');
    expect(execute.mock.calls[0][1]).toEqual(expect.arrayContaining([owner, matterId, "מועד הגשה", null]));
    expect(execute.mock.calls[1][0]).toContain('insert into "tasks"');
  });
  it.each([true, false])("persists explicit done=%s without toggling other fields", async (done) => {
    expect((await setTaskDone(matterId, recordId, done)).success).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('update "tasks" set "done" =');
    for (const column of ["id", "matter_id", "owner_user_id"]) expect(sql).toContain(`"tasks"."${column}" =`);
    expect(params).toEqual(expect.arrayContaining([done, recordId, matterId, owner]));
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
  it("rejects completion for inaccessible parents/rows", async () => {
    mocks.matter.mockResolvedValueOnce(null);
    expect((await setTaskDone(matterId, recordId, true)).error).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
    execute.mockResolvedValue({ rows: [] });
    expect((await setTaskDone(matterId, recordId, true)).error).toBeTruthy();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("authenticates every action before any data access", async () => {
    mocks.auth.mockRejectedValue(new Error("login required"));
    for (const { save, values } of cases) await expect(save(matterId, null, {}, form(values))).rejects.toThrow("login required");
    await expect(setTaskDone(matterId, recordId, true)).rejects.toThrow("login required");
    expect(mocks.matter).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
  });
  it("validates IDs, booleans and input on the server before querying", async () => {
    for (const { save, values } of cases) {
      await save("invalid", null, {}, form(values));
      await save(matterId, "invalid", {}, form(values));
      await save(matterId, null, {}, form({ ...values, title: " " }));
    }
    await setTaskDone(matterId, recordId, "false" as unknown as boolean);
    await setTaskDone(matterId, null as unknown as string, true);
    expect(mocks.matter).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
  });
  it("retains input and hides database errors", async () => {
    execute.mockRejectedValue(new Error("secret database details"));
    for (const { save, values } of cases) {
      const state = await save(matterId, null, {}, form(values));
      expect(state.values?.title).toBe("כותרת");
      expect(state.error).toBeTruthy(); expect(state.error).not.toContain("secret");
    }
    expect((await setTaskDone(matterId, recordId, true)).error).not.toContain("secret");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
