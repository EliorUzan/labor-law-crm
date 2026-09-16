import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DesktopVersionStatus } from "./status";
import { parseDesktopReleaseConfig } from "./metadata";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete window.crmDesktop;
  vi.unstubAllGlobals();
});
function desktop(version = "1.9.0") {
  window.crmDesktop = {
    getAppInfo: async () => ({ version, platform: "win32", arch: "x64" }),
    getBridgeInfo: vi.fn(), documentSettings: vi.fn(), chooseDocumentRoot: vi.fn(),
    chooseDocuments: vi.fn(), droppedDocuments: vi.fn(), openDocument: vi.fn(),
  };
}
async function render(detail = true) {
  await act(async () => { root.render(<DesktopVersionStatus detail={detail} />); });
}
it("does not check release metadata in the browser", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await render();
  expect(container.textContent).toContain("בדפדפן");
  expect(fetcher).not.toHaveBeenCalled();
});
it("shows a manual download notice for a numerically newer published release", async () => {
  desktop();
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => parseDesktopReleaseConfig("1.10.0", "https://downloads.example") });
  vi.stubGlobal("fetch", fetcher);
  await render();
  expect(container.textContent).toContain("1.9.0");
  expect(container.textContent).toContain("1.10.0");
  expect(container.querySelector("a")?.getAttribute("href")).toBe("/downloads");
  expect(fetcher).toHaveBeenCalledWith("/api/desktop/release", expect.objectContaining({ cache: "no-store" }));
});
it.each(["1.9.0", "1.8.0"])("does not show an update banner for published %s", async (version) => {
  desktop();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => parseDesktopReleaseConfig(version, "https://downloads.example") }));
  await render(false);
  expect(container.textContent).toBe("");
});
it.each(["network", "invalid", "unpublished"])("does not claim current when metadata is %s", async (mode) => {
  desktop();
  vi.stubGlobal("fetch", mode === "network"
    ? vi.fn().mockRejectedValue(new Error("offline"))
    : vi.fn().mockResolvedValue({ ok: true, json: async () => mode === "invalid" ? { version: "bad" } : null }));
  await render();
  expect(container.textContent).toContain("אינה זמינה");
  expect(container.textContent).not.toContain("עדכנית");
  expect(container.querySelector("a")).toBeNull();
});
