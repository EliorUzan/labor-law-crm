import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { createMatter, updateMatter, saveHistoryEntry, saveMatterNote } from "./actions";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), database: vi.fn(), client: vi.fn(), matter: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: mocks.auth }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("@/modules/clients/queries", () => ({ getClient: mocks.client }));
vi.mock("./queries", () => ({ getMatter: mocks.matter }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
const owner = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const matterId = "33333333-3333-4333-8333-333333333333";
const entryId = "44444444-4444-4444-8444-444444444444";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
};
const history = () => form({ title: "אירוע", eventDate: "2026-09-08" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(owner);
  mocks.client.mockResolvedValue({ id: clientId });
  mocks.matter.mockResolvedValue({ matter: { id: matterId }, client: { id: clientId } });
  execute.mockReset().mockResolvedValue({ rows: [[matterId]] });
  mocks.database.mockReturnValue(drizzle(execute));
});

describe("Matter and history mutations", () => {
  it("authenticates all actions before querying or writing", async () => {
    mocks.auth.mockRejectedValue(new Error("login redirect"));
    for (const run of [() => createMatter(clientId, {}, form({ title: "תיק" })),
      () => updateMatter(matterId, {}, form({ title: "תיק" })),
      () => saveHistoryEntry(matterId, null, {}, history()), () => saveHistoryEntry(matterId, entryId, {}, history()),
      () => saveMatterNote(matterId, null, {}, form({ content: "הערה" })), () => saveMatterNote(matterId, entryId, {}, form({ content: "הערה" }))]) {
      await expect(run()).rejects.toThrow("login redirect");
    }
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.matter).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
  it("checks Client ownership and ignores forged IDs during title-only creation", async () => {
    await createMatter(clientId, {}, form({ title: "תיק", ownerUserId: "forged", clientId: "forged", id: "forged" }));
    expect(mocks.client).toHaveBeenCalledWith(owner, clientId);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('insert into "matters"');
    expect(params).toEqual(expect.arrayContaining([owner, clientId, "תיק"]));
    expect(params).not.toContain("forged");
    expect(mocks.redirect).toHaveBeenCalledWith(`/matters/${matterId}`);
    for (const path of ["/", "/clients", `/clients/${clientId}`, `/matters/${matterId}`]) expect(mocks.revalidate).toHaveBeenCalledWith(path);
  });
  it("prevents creation under another user's Client", async () => {
    mocks.client.mockResolvedValue(null);
    expect((await createMatter(clientId, {}, form({ title: "תיק" }))).error).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
  });
  it("prevents Matter, history and note writes when the Matter/Client ownership check fails", async () => {
    mocks.matter.mockResolvedValue(null);
    expect((await updateMatter(matterId, {}, form({ title: "תיק" }))).error).toBeTruthy();
    expect((await saveHistoryEntry(matterId, null, {}, history())).error).toBeTruthy();
    expect((await saveHistoryEntry(matterId, entryId, {}, history())).error).toBeTruthy();
    expect((await saveMatterNote(matterId, null, {}, form({ content: "הערה" }))).error).toBeTruthy();
    expect(mocks.matter).toHaveBeenCalledWith(owner, matterId);
    expect(execute).not.toHaveBeenCalled();
  });
  it("updates only editable fields, scopes all ownership IDs, clears optional values and touches updated_at", async () => {
    await updateMatter(matterId, {}, form({ title: "מעודכן", status: "closed", clientId: "forged", ownerUserId: "forged", id: "forged" }));
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('"updated_at" =');
    expect(sql).toContain('"matters"."client_id" =');
    expect(sql).toContain('"matters"."owner_user_id" =');
    expect(params).toEqual(expect.arrayContaining([owner, clientId, matterId, "closed"]));
    expect(params).not.toContain("forged");
    expect(sql.split(" where ")[0]).not.toMatch(/"(owner_user_id|client_id|id)" =/);
  });
  it("creates history under the authenticated Matter, with no extra metadata", async () => {
    const values = history();
    values.set("matterId", "forged"); values.set("ownerUserId", "forged");
    expect((await saveHistoryEntry(matterId, null, {}, values)).success).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('insert into "matter_history"');
    expect(params).toEqual(expect.arrayContaining([owner, matterId, "2026-09-08", "אירוע", null]));
    expect(params).not.toContain("forged");
  });
  it("cannot edit a history entry belonging to another Matter or owner", async () => {
    execute.mockResolvedValue({ rows: [] });
    expect((await saveHistoryEntry(matterId, entryId, {}, history())).error).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    for (const column of ["id", "matter_id", "owner_user_id"]) expect(sql).toContain(`"matter_history"."${column}" =`);
    expect(params).toEqual(expect.arrayContaining([entryId, matterId, owner]));
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("adds separate notes under the owned Matter and ignores forged ownership data", async () => {
    const values = form({ content: "  הערה חדשה  ", matterId: "forged", ownerUserId: "forged" });
    expect((await saveMatterNote(matterId, null, {}, values)).success).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('insert into "matter_notes"');
    expect(params).toEqual(expect.arrayContaining([owner, matterId, "הערה חדשה"]));
    expect(params).not.toContain("forged");
  });
  it("edits a note without changing its original creation timestamp and scopes all ownership IDs", async () => {
    expect((await saveMatterNote(matterId, entryId, {}, form({ content: "תיקון" }))).success).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('update "matter_notes" set "content" =');
    expect(sql).toContain('"updated_at" =');
    expect(sql).not.toContain('"created_at" =');
    for (const column of ["id", "matter_id", "owner_user_id"]) expect(sql).toContain(`"matter_notes"."${column}" =`);
    expect(params).toEqual(expect.arrayContaining([entryId, matterId, owner, "תיקון"]));
  });
  it("rejects note edits that do not belong to the owner and Matter", async () => {
    execute.mockResolvedValue({ rows: [] });
    expect((await saveMatterNote(matterId, entryId, {}, form({ content: "תיקון" }))).error).toBeTruthy();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("rejects zero-row Matter updates", async () => {
    execute.mockResolvedValue({ rows: [] });
    expect((await updateMatter(matterId, {}, form({ title: "תיק" }))).error).toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("validates IDs and data before querying", async () => {
    await createMatter("invalid", {}, form({ title: "תיק" }));
    await updateMatter(matterId, {}, form({ title: " " }));
    await saveHistoryEntry(matterId, "invalid", {}, history());
    await saveHistoryEntry(matterId, null, {}, form({ title: "אירוע", eventDate: "2026-02-30" }));
    await saveMatterNote(matterId, "invalid", {}, form({ content: "הערה" }));
    await saveMatterNote(matterId, null, {}, form({ content: " " }));
    expect(mocks.client).not.toHaveBeenCalled(); expect(mocks.matter).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
  it("retains input and reports safe errors for failed saves", async () => {
    execute.mockRejectedValue(new Error("secret SQL details"));
    for (const state of [await createMatter(clientId, {}, form({ title: "תיק" })),
      await updateMatter(matterId, {}, form({ title: "תיק" })), await saveHistoryEntry(matterId, null, {}, history()),
      await saveMatterNote(matterId, null, {}, form({ content: "הערה" }))]) {
      expect(state.error).toBeTruthy(); expect(state.error).not.toContain("SQL"); expect(state.values?.title ?? state.values?.content).toBeTruthy();
    }
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
