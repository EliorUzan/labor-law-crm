import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { addObligation, updateObligation, setObligationCompletion } from "./actions";
import { obligationSchema } from "./validation";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), database: vi.fn(), owns: vi.fn(), deadline: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: mocks.auth }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("./queries", () => ({ ownsClientMatter: mocks.owns, getClientDeadline: mocks.deadline }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const owner = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const matterId = "33333333-3333-4333-8333-333333333333";
const deadlineId = "44444444-4444-4444-8444-444444444444";
const obligationId = "55555555-5555-4555-8555-555555555555";
const otherMatter = "66666666-6666-4666-8666-666666666666";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
const form = (values: Record<string, string> = {}) => {
  const result = new FormData();
  for (const [key, value] of Object.entries({ title: "לשלוח טיוטה", ...values })) result.set(key, value);
  return result;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(owner); mocks.owns.mockResolvedValue(true); mocks.deadline.mockResolvedValue({ id: deadlineId });
  execute.mockReset().mockImplementation(async (sql) => ({ rows: sql.startsWith("select") ? [[matterId]] : [[obligationId, matterId]] }));
  mocks.database.mockReturnValue(drizzle(execute));
});

describe("optional obligation pairing", () => {
  it.each([{}, { matterId }, { matterId, deadlineId }])("accepts the optional pairing state %j", (pairing) => {
    const result = obligationSchema.parse({ clientId, title: "התחייבות", ...pairing });
    expect(result.matterId).toBe("matterId" in pairing ? matterId : null);
    expect(result.deadlineId).toBe("deadlineId" in pairing ? deadlineId : null);
  });
  it("allows a Client Deadline without Matter and retains the legacy independent date only when unpaired", () => {
    expect(obligationSchema.safeParse({ clientId, title: "התחייבות", deadlineId }).success).toBe(true);
    expect(obligationSchema.parse({ clientId, title: "התחייבות", dueDate: "2026-09-14" }).dueDate).toBe("2026-09-14");
    expect(obligationSchema.parse({ clientId, title: "התחייבות", matterId, deadlineId, dueDate: "2026-09-14" }).dueDate).toBeNull();
  });
  it("creates multiple obligations referencing the same Deadline without copying its date", async () => {
    for (let n = 0; n < 2; n++) expect((await addObligation(clientId, {}, form({ matterId, deadlineId, dueDate: "2026-09-14", ownerUserId: "forged", done: "true" }))).success).toBeTruthy();
    expect(mocks.owns).toHaveBeenCalledWith(owner, clientId, matterId);
    expect(mocks.deadline).toHaveBeenCalledWith(owner, clientId, deadlineId, matterId);
    for (const [sql, params] of execute.mock.calls) {
      expect(sql).toContain('insert into "client_obligations"');
      expect(params).toEqual(expect.arrayContaining([owner, clientId, matterId, deadlineId, false]));
      expect(params).not.toContain("2026-09-14"); expect(params).not.toContain("forged");
    }
  });
  it("creates a standalone no-description Deadline directly from an obligation", async () => {
    const result = await addObligation(clientId, {}, form({ createDeadline: "true", newDeadlineMatterId: matterId,
      newDeadlineTitle: "מועד הגשה", newDeadlineDate: "2026-09-14" }));
    expect(result.success).toBeTruthy();
    expect(mocks.owns).toHaveBeenCalledWith(owner, clientId, matterId);
    expect(execute.mock.calls[0][0]).toContain('insert into "deadlines"');
    expect(execute.mock.calls[0][1]).toEqual(expect.arrayContaining([owner, matterId, "מועד הגשה", null]));
    expect(execute.mock.calls[1][0]).toContain('insert into "client_obligations"');
    expect(execute.mock.calls[1][1]).toContain(obligationId);
  });
  it("rejects cross-Client Matters and unavailable Deadlines before any write", async () => {
    mocks.owns.mockResolvedValue(false);
    expect((await addObligation(clientId, {}, form({ matterId, deadlineId }))).error).toBeTruthy();
    expect((await updateObligation(clientId, obligationId, {}, form({ matterId, deadlineId }))).error).toBeTruthy();
    expect(mocks.deadline).not.toHaveBeenCalled();
    mocks.owns.mockResolvedValue(true); mocks.deadline.mockResolvedValue(null);
    expect((await addObligation(clientId, {}, form({ matterId, deadlineId }))).error).toBeTruthy();
    expect((await updateObligation(clientId, obligationId, {}, form({ matterId, deadlineId }))).error).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
  });
  it.each([{ matterId, deadlineId }, { matterId, deadlineId: "" }, { matterId: otherMatter, deadlineId: "" }, { matterId: "", deadlineId: "" }])("edits pairing %j without moving Client or changing completion", async (pairing) => {
    expect((await updateObligation(clientId, obligationId, {}, form({ ...pairing, clientId: "forged", done: "true" }))).success).toBeTruthy();
    const [sql, params] = execute.mock.calls.find(([sql]) => sql.startsWith("update"))!;
    for (const column of ["id", "client_id", "owner_user_id"]) expect(sql).toContain(`"client_obligations"."${column}" =`);
    expect(sql.split(" where ")[0]).not.toMatch(/"(client_id|owner_user_id|done)" =/);
    expect(params).toEqual(expect.arrayContaining([clientId, owner, obligationId, pairing.matterId || null, pairing.deadlineId || null]));
    expect(params).not.toContain("forged");
    expect(mocks.revalidate).toHaveBeenCalledWith(`/matters/${matterId}`);
    if (pairing.matterId === otherMatter) expect(mocks.revalidate).toHaveBeenCalledWith(`/matters/${otherMatter}`);
    expect(mocks.revalidate).toHaveBeenCalledWith(`/clients/${clientId}`);
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
  it("allows a valid Deadline if Matter was not selected", async () => {
    expect((await updateObligation(clientId, obligationId, {}, form({ matterId: "", deadlineId }))).success).toBeTruthy();
    expect(mocks.deadline).toHaveBeenCalledWith(owner, clientId, deadlineId, null);
  });
  it("refuses edits to another owner's or Client's obligation and handles zero-row updates", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    expect((await updateObligation(clientId, obligationId, {}, form())).error).toBeTruthy();
    expect(execute).toHaveBeenCalledTimes(1);
    execute.mockClear().mockResolvedValueOnce({ rows: [[matterId]] }).mockResolvedValueOnce({ rows: [] });
    expect((await updateObligation(clientId, obligationId, {}, form())).error).toBeTruthy();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("authenticates editing and validates IDs, retaining submitted values on failure", async () => {
    await updateObligation(clientId, "invalid", {}, form());
    expect(execute).not.toHaveBeenCalled();
    mocks.auth.mockRejectedValueOnce(new Error("sign in"));
    await expect(updateObligation(clientId, obligationId, {}, form())).rejects.toThrow("sign in");
    execute.mockRejectedValueOnce(new Error("secret database detail"));
    const result = await updateObligation(clientId, obligationId, {}, form({ matterId, deadlineId }));
    expect(result.values?.deadlineId).toBe(deadlineId);
    expect(result.error).toBeTruthy(); expect(result.error).not.toContain("secret");
  });
  it("refreshes the linked Matter on completion without changing pairing", async () => {
    expect((await setObligationCompletion(clientId, obligationId, {}, form({ done: "true" }))).success).toBeTruthy();
    expect(execute.mock.calls[0][0].split(" where ")[0]).not.toContain('"deadline_id" =');
    expect(mocks.revalidate).toHaveBeenCalledWith(`/matters/${matterId}`);
  });
});
