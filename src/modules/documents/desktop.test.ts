import { afterEach, describe, expect, it, vi } from "vitest";
import { desktopDocuments } from "./desktop";

afterEach(() => { delete window.crmDesktop; });
describe("desktop document opening", () => {
  function install(openDocument = vi.fn()) {
    window.crmDesktop = { getBridgeInfo: vi.fn(), documentSettings: vi.fn(), chooseDocumentRoot: vi.fn(), chooseDocuments: vi.fn(), droppedDocuments: vi.fn(), openDocument };
    return openDocument;
  }
  it("passes the relative path to the registered native operation", async () => {
    const open = install(vi.fn().mockResolvedValue({ ok: true, value: { localPath: "G:/My Drive/CRM/מסמך.docx" } }));
    await expect(desktopDocuments.open("CRM/מסמך.docx")).resolves.toEqual({ localPath: "G:/My Drive/CRM/מסמך.docx" });
    expect(open).toHaveBeenCalledWith("CRM/מסמך.docx");
  });
  it("explains how to recover an old desktop process instead of displaying IPC internals", async () => {
    install(vi.fn().mockRejectedValue(new Error("Error invoking remote method 'documents:open': Error: No handler registered for 'documents:open'")));
    await expect(desktopDocuments.open("file.docx")).rejects.toThrow("סגור את יישום ה-CRM");
    await expect(desktopDocuments.open("file.docx")).rejects.not.toThrow("No handler registered");
  });
  it("preserves native validation errors", async () => {
    install(vi.fn().mockResolvedValue({ ok: false, error: "יש להגדיר ולאמת תיקיית Google Drive" }));
    await expect(desktopDocuments.open("file.docx")).rejects.toThrow("יש להגדיר ולאמת");
  });
});
