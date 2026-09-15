import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentPanel } from "./document-panel";

const mocks = vi.hoisted(() => ({ platform: vi.fn(), list: vi.fn(), open: vi.fn(), settings: vi.fn() }));
vi.mock("@/lib/desktop-bridge", () => ({ getCrmPlatformCapabilities: mocks.platform }));
vi.mock("./actions", () => ({ listTargetDocuments: mocks.list, addDocument: vi.fn(), browseDrive: vi.fn(), createManagedDocument: vi.fn(), unlinkDocument: vi.fn() }));
vi.mock("./desktop", () => ({ desktopDocuments: { open: mocks.open, settings: mocks.settings } }));
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.resetAllMocks();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  mocks.platform.mockResolvedValue({ platform: "desktop" });
  mocks.settings.mockResolvedValue({ localRoot: "G:/My Drive" });
  mocks.open.mockResolvedValue({ localPath: "G:/My Drive/CRM/letter.docx" });
  mocks.list.mockResolvedValue({ ok: true, value: [{ id: "doc-1", displayName: "letter.docx", relativePath: "CRM/letter.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }] });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render() { await act(async () => root.render(<DocumentPanel expanded target={{ type: "client", id: "client-1" }} />)); }
describe("document open choices", () => {
  it("keeps Drive opening separate from the explicit local-file button on desktop", async () => {
    await render();
    const drive = Array.from(container.querySelectorAll("a")).find((a) => a.textContent === "פתיחה ב-Google Drive")!;
    expect(drive.getAttribute("href")).toBe("/api/documents/open/doc-1");
    expect(drive.target).toBe("_blank");
    // Prevent jsdom navigation; the native operation must never handle this click.
    drive.addEventListener("click", (event) => event.preventDefault());
    await act(async () => drive.click());
    expect(mocks.open).not.toHaveBeenCalled();
    const local = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "פתח קובץ")!;
    await act(async () => local.click());
    expect(mocks.open).toHaveBeenCalledWith("CRM/letter.docx");
  });
  it("shows only Google opening in the web app", async () => {
    mocks.platform.mockResolvedValue({ platform: "web" });
    await render();
    expect(container.textContent).not.toContain("פתח קובץ");
    expect(container.textContent).toContain("פתיחה ב-Google Drive");
  });
  it("explains Google-native files without trying to open a nonexistent Word file", async () => {
    mocks.list.mockResolvedValue({ ok: true, value: [{ id: "doc-1", displayName: "Google document", relativePath: "CRM/Google document", mimeType: "application/vnd.google-apps.document" }] });
    await render();
    const local = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "פתח קובץ")!;
    await act(async () => local.click());
    expect(mocks.open).not.toHaveBeenCalled();
    expect(container.textContent).toContain("זהו מסמך Google שנפתח בדפדפן");
  });
});
