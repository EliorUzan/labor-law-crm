// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentError, driveApi, exchangeTokens, fileAtPath, metadata, pathForFile, seal, unseal, type Drive } from "./google-drive";
import { documentWebUrl, driveIdFromUrl, folderSegment } from "./validation";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const file = { id: "file-1", name: "claim.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", parents: ["matter"] };
describe("Google Drive document resolution", () => {
  it("uses format-specific Google editors and preserves resource keys", () => {
    expect(documentWebUrl("id1", "claim.docx", file.mimeType)).toBe("https://docs.google.com/document/d/id1/edit");
    expect(documentWebUrl("id1", "fees.xlsx", "application/octet-stream")).toBe("https://docs.google.com/spreadsheets/d/id1/edit");
    expect(documentWebUrl("id1", "scan.pdf", "application/pdf", "secret-key")).toBe("https://drive.google.com/file/d/id1/view?resourcekey=secret-key");
    for (const link of ["file:///c:/secret", "https://drive.google.com.evil.test/file/d/id1", "https://user@drive.google.com/file/d/id1", "javascript:alert(1)"]) expect(driveIdFromUrl(link)).toBeNull();
    expect(driveIdFromUrl("https://drive.google.com/drive/folders/folder1")).toBe("folder1");
  });
  it("resolves ancestry against the configured root and rejects outside files", async () => {
    const api = vi.fn().mockResolvedValueOnce({ id: "matter", name: "matter1", mimeType: "application/vnd.google-apps.folder", parents: ["root"] }).mockResolvedValueOnce({ id: "root", name: "root", mimeType: "application/vnd.google-apps.folder" });
    await expect(pathForFile({ api, rootId: "root" } as unknown as Drive, file)).resolves.toBe("matter1/claim.docx");
    await expect(pathForFile({ api, rootId: "elsewhere" } as unknown as Drive, { ...file, parents: [] })).rejects.toThrow("מחוץ לתיקיית");
  });
  it("never guesses when duplicate cloud paths or pending synchronization occur", async () => {
    const api = vi.fn().mockResolvedValue({ files: [file, { ...file, id: "file-2" }] });
    await expect(fileAtPath({ api, rootId: "root" } as unknown as Drive, "claim.docx")).rejects.toThrow("כמה קבצים");
    api.mockResolvedValue({ files: [] });
    await expect(fileAtPath({ api, rootId: "root" } as unknown as Drive, "claim.docx")).rejects.toThrow("סיום הסנכרון");
  });
  it("refuses shortcuts and invalid paths", async () => {
    const api = vi.fn().mockResolvedValue({ files: [{ ...file, mimeType: "application/vnd.google-apps.shortcut" }] });
    await expect(fileAtPath({ api, rootId: "root" } as unknown as Drive, "claim.docx")).rejects.toThrow("קיצורי דרך");
    expect(() => metadata(file, "../claim.docx")).toThrow();
    expect(folderSegment("name/with:unsafe", "123")).toBe("name_with_unsafe (123)");
  });
  it("encrypts tokens with authentication and rejects modified ciphertext", () => {
    vi.stubEnv("GOOGLE_DRIVE_CLIENT_ID", "test"); vi.stubEnv("GOOGLE_DRIVE_CLIENT_SECRET", "test"); vi.stubEnv("DOCUMENT_TOKEN_ENCRYPTION_KEY", "ab".repeat(32)); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    const encrypted = seal("refresh-token"); expect(encrypted).not.toContain("refresh-token"); expect(unseal(encrypted)).toBe("refresh-token");
    const bytes = Buffer.from(encrypted, "base64url"); bytes[15] ^= 1;
    expect(() => unseal(bytes.toString("base64url"))).toThrow();
  });
  it("does not expose provider error bodies or bearer tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ access_token: "secret" }) }));
    await expect(driveApi("secret")("files")).rejects.toThrow(DocumentError);
    await expect(driveApi("secret")("files")).rejects.not.toThrow("secret");
  });
  it.each([
    { errors: [{ reason: "accessNotConfigured" }] },
    { details: [{ reason: "SERVICE_DISABLED", metadata: { secret: "private-provider-data" } }] },
  ])("identifies a disabled Drive API without exposing provider details", async (error) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { ...error, message: "private-provider-data" } }), { status: 403 })));
    await expect(driveApi("secret")("about?fields=user(permissionId)")).rejects.toMatchObject({ reason: "api-disabled" });
  });
  it("distinguishes rejected OAuth credentials without returning Google's body", async () => {
    vi.stubEnv("GOOGLE_DRIVE_CLIENT_ID", "test"); vi.stubEnv("GOOGLE_DRIVE_CLIENT_SECRET", "private-secret"); vi.stubEnv("DOCUMENT_TOKEN_ENCRYPTION_KEY", "ab".repeat(32)); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_client", error_description: "private-secret" }), { status: 401 })));
    await expect(exchangeTokens({ code: "private-code" })).rejects.toMatchObject({ reason: "oauth-client", message: expect.not.stringContaining("private-secret") });
  });
});
