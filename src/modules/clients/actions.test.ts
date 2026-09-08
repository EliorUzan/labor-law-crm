import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { createClient, updateClient, addFinancialRecord, addObligation, setObligationCompletion } from "./actions";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), database: vi.fn(), owns: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: mocks.auth }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("./queries", () => ({ ownsClientMatter: mocks.owns }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
const owner = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const obligationId = "33333333-3333-4333-8333-333333333333";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(owner);
  mocks.owns.mockResolvedValue(true);
  execute.mockReset().mockResolvedValue({ rows: [[clientId]] });
  mocks.database.mockReturnValue(drizzle(execute));
});

describe("client mutations", () => {
  it("authenticates every action before accessing CRM data", async () => {
    mocks.auth.mockRejectedValue(new Error("login redirect"));
    for (const run of [
      () => createClient({}, form({ name: "שם" })),
      () => updateClient(clientId, {}, form({ name: "שם" })),
      () => addFinancialRecord(clientId, {}, form({})),
      () => addObligation(clientId, {}, form({})),
      () => setObligationCompletion(clientId, obligationId, {}, form({ done: "true" })),
    ]) await expect(run()).rejects.toThrow("login redirect");
    expect(execute).not.toHaveBeenCalled();
  });
  it("creates a name-only client using the session owner and generated identity", async () => {
    await createClient({}, form({ name: "שם", ownerUserId: "attacker", id: "attacker" }));
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('insert into "clients"');
    expect(params).toContain(owner);
    expect(params).not.toContain("attacker");
    expect(mocks.redirect).toHaveBeenCalledWith(`/clients/${clientId}`);
  });
  it("scopes updates to the authenticated owner and rejects zero updated rows", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    expect((await updateClient(clientId, {}, form({ name: "שם" }))).error).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('"clients"."owner_user_id" =');
    expect(params).toContain(owner);
    expect(params).toContain(clientId);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("prevents child inserts under an inaccessible client or mismatched Matter", async () => {
    mocks.owns.mockResolvedValue(false);
    expect((await addFinancialRecord(clientId, {}, form({ type: "charge", amount: "1", recordDate: "2026-09-08", matterId: obligationId }))).error).toBeTruthy();
    expect((await addObligation(clientId, {}, form({ title: "לחזור ללקוח", matterId: obligationId }))).error).toBeTruthy();
    expect(mocks.owns).toHaveBeenCalledWith(owner, clientId, obligationId);
    expect(execute).not.toHaveBeenCalled();
  });
  it("writes an exact decimal and invalidates the client and Dashboard", async () => {
    expect((await addFinancialRecord(clientId, {}, form({ type: "fee", amount: "0001.2", recordDate: "2026-09-08" }))).success).toBeTruthy();
    expect(execute.mock.calls[0][1]).toContain("1.20");
    expect(mocks.revalidate).toHaveBeenCalledWith(`/clients/${clientId}`);
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
  it("creates obligations open even if the submitted form requests done", async () => {
    await addObligation(clientId, {}, form({ title: "לחזור ללקוח", done: "true" }));
    expect(execute.mock.calls[0][1]).toContain(false);
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
  it.each(["true", "false"])("sets completion explicitly to %s and scopes all three IDs", async (done) => {
    expect((await setObligationCompletion(clientId, obligationId, {}, form({ done }))).success).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('"client_obligations"."owner_user_id" =');
    expect(sql).toContain('"client_obligations"."client_id" =');
    expect(sql).toContain('"client_obligations"."id" =');
    expect(params).toEqual(expect.arrayContaining([done === "true", owner, clientId, obligationId]));
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
  it("does not report success for an inaccessible obligation", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    expect((await setObligationCompletion(clientId, obligationId, {}, form({ done: "true" }))).error).toBeTruthy();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("keeps entered values and hides database details on failure", async () => {
    execute.mockRejectedValueOnce(new Error("secret SQL details"));
    const state = await addFinancialRecord(clientId, {}, form({ type: "payment", amount: "12.30", recordDate: "2026-09-08" }));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain("SQL");
    expect(state.values?.amount).toBe("12.30");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
