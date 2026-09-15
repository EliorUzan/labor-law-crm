// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import native from "./documents.cjs";

let workspace;
let root;
beforeEach(async () => { workspace = await fs.mkdtemp(path.join(os.tmpdir(), "crm-document-test-")); root = path.join(workspace, "Drive"); await fs.mkdir(root); });
afterEach(async () => { await fs.rm(workspace, { recursive: true, force: true }); });
describe("native document boundary", () => {
  it("rejects traversal, absolute paths, Windows devices and alternate data streams", () => {
    for (const value of ["../private.docx", "/private.docx", "C:/private.docx", "a/../b", "a\\b", "a:x", "CON.docx", "a./b", "a/", "a\u0000b"]) expect(() => native.parts(value)).toThrow();
    expect(native.parts("CRM/לקוח/תיק/file.docx")).toHaveLength(4);
  });
  it("links existing files without changing contents or location and rejects siblings", async () => {
    const file = path.join(root, "מסמך.docx"); await fs.writeFile(file, "original");
    await expect(native.describeFile(root, file)).resolves.toMatchObject({ relativePath: "מסמך.docx", sizeBytes: 8 });
    expect(await fs.readFile(file, "utf8")).toBe("original");
    await expect(native.describeFile(root, path.join(workspace, "Drive-other", "file.docx"))).rejects.toThrow("מחוץ לתיקיית");
  });
  it("rejects junction escapes before reading a file", async () => {
    const outside = path.join(workspace, "outside"); await fs.mkdir(outside); await fs.writeFile(path.join(outside, "secret.txt"), "private");
    await fs.symlink(outside, path.join(root, "escape"), "junction");
    await expect(native.resolveFile(root, "escape/secret.txt")).rejects.toThrow("קישורים");
  });
  it("rejects an ordinary folder, verifies matching cloud proof, and reuses CRM", async () => {
    const proof = { name: `.crm-verification-${"a".repeat(32)}.txt`, content: "b".repeat(64) };
    await expect(native.verifyRoot(root, proof)).rejects.toThrow("לא אומתה");
    await fs.writeFile(path.join(root, proof.name), proof.content);
    await expect(native.verifyRoot(root, proof)).resolves.toBe(await fs.realpath(root));
    await fs.writeFile(path.join(root, "CRM", "existing.txt"), "keep");
    await native.verifyRoot(root, proof);
    expect(await fs.readFile(path.join(root, "CRM", "existing.txt"), "utf8")).toBe("keep");
    await expect(native.verifyRoot(root, { ...proof, content: "c".repeat(64) })).rejects.toThrow("לא אומתה");
  });
  it("rejects a symlinked CRM destination", async () => {
    const proof = { name: `.crm-verification-${"a".repeat(32)}.txt`, content: "b".repeat(64) };
    await fs.writeFile(path.join(root, proof.name), proof.content);
    const outside = path.join(workspace, "outside"); await fs.mkdir(outside);
    await fs.symlink(outside, path.join(root, "CRM"), "junction");
    await expect(native.verifyRoot(root, proof)).rejects.toThrow();
  });
  it("rejects untrusted senders and opens only validated documents in the default app", async () => {
    const handlers = new Map(); const openPath = vi.fn().mockResolvedValue("");
    const crmUrl = new URL("https://crm.example.com");
    const context = { ownerUserId: "owner", rootId: "cloud-root" };
    await fs.writeFile(path.join(workspace, "document-roots.json"), JSON.stringify({ [`${crmUrl.origin}|owner|cloud-root`]: root }));
    await fs.writeFile(path.join(root, "example.docx"), "content");
    await fs.writeFile(path.join(root, "unsafe.exe"), "content");
    native.installDocumentHandlers({ ipcMain: { handle: (name, handler) => handlers.set(name, handler) }, dialog: {}, shell: { openPath }, app: { getPath: () => workspace }, crmUrl, contextFor: async () => context });
    const frame = { url: crmUrl.href }; const event = { senderFrame: frame, sender: { mainFrame: frame, session: {} } };
    const open = handlers.get("documents:open");
    expect((await open(event, "example.docx")).ok).toBe(true);
    expect(openPath).toHaveBeenCalledWith(path.join(await fs.realpath(root), "example.docx"));
    expect((await open(event, "unsafe.exe")).ok).toBe(false);
    expect((await open({ ...event, senderFrame: { url: "https://evil.example" } }, "example.docx")).ok).toBe(false);
    expect(openPath).toHaveBeenCalledTimes(1);
  });
});
