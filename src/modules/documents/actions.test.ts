import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { saveDocumentReference } from "./actions";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), database: vi.fn(), matter: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: mocks.auth }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("@/modules/matters/queries", () => ({ getMatter: mocks.matter }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

const owner = "11111111-1111-4111-8111-111111111111";
const matterId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
};

beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue(owner); mocks.matter.mockResolvedValue({ matter: { id: matterId } });
  execute.mockReset().mockResolvedValue({ rows: [[documentId]] }); mocks.database.mockReturnValue(drizzle(execute));
});

describe("Document reference mutations", () => {
  it("creates a document only below the authenticated owner's Matter", async () => {
    expect((await saveDocumentReference(matterId, null, {}, form({ displayName: "הסכם", location: "C:\\Cases\\agreement.pdf", ownerUserId: "forged" }))).success).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('insert into "document_references"');
    expect(params).toEqual(expect.arrayContaining([owner, matterId, "הסכם", "C:\\Cases\\agreement.pdf"]));
    expect(params).not.toContain("forged"); expect(mocks.revalidate).toHaveBeenCalledWith(`/matters/${matterId}`);
  });

  it("rejects inaccessible Matter and scopes edits by document, Matter and owner", async () => {
    mocks.matter.mockResolvedValue(null);
    expect((await saveDocumentReference(matterId, null, {}, form({ displayName: "הסכם", location: "C:\\path" }))).error).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
    mocks.matter.mockResolvedValue({ matter: { id: matterId } }); execute.mockResolvedValue({ rows: [] });
    expect((await saveDocumentReference(matterId, documentId, {}, form({ displayName: "הסכם", location: "https://example.com" }))).error).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    for (const column of ["id", "matter_id", "owner_user_id"]) expect(sql).toContain(`"document_references"."${column}" =`);
    expect(params).toEqual(expect.arrayContaining([documentId, matterId, owner]));
  });
});
