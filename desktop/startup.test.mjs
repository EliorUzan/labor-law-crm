// @vitest-environment node
import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import native from "./documents.cjs";
import security from "./security.cjs";
import appInfo from "./app-info.cjs";

it("registers every preload document channel before loading the CRM window", async () => {
  const handlers = new Map();
  let bridge;
  let startup;
  const root = path.dirname(fileURLToPath(import.meta.url));
  const electron = {
    app: { whenReady: () => ({ then: (fn) => { startup = Promise.resolve().then(fn); return startup; } }), getPath: () => root, on: vi.fn(), quit: vi.fn() },
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    session: { defaultSession: { setPermissionRequestHandler: vi.fn() } },
    dialog: {}, shell: {},
    BrowserWindow: class {
      webContents = { on: vi.fn(), setWindowOpenHandler: vi.fn() };
      loadURL() {
        expect(handlers.has("desktop:app-info")).toBe(true);
        for (const channel of ["settings", "choose-root", "choose-files", "dropped-files", "open"]) expect(handlers.has(`documents:${channel}`)).toBe(true);
      }
    },
  };
  vm.runInNewContext(readFileSync(path.join(root, "main.cjs"), "utf8"), {
    require: (name) => ({ "electron": electron, "node:path": path, "./documents.cjs": native, "./security.cjs": security, "./app-info.cjs": appInfo })[name],
    __dirname: root, URL, console, process: { platform: "win32" },
  });
  await startup;
  expect(electron.app.quit).not.toHaveBeenCalled();
  const invoke = vi.fn().mockImplementation((channel) => {
    if (!handlers.has(channel)) throw new Error(`No handler registered for '${channel}'`);
    return Promise.resolve();
  });
  vm.runInNewContext(readFileSync(path.join(root, "preload.cjs"), "utf8"), {
    require: () => ({ contextBridge: { exposeInMainWorld: (_name, value) => { bridge = value; } }, ipcRenderer: { invoke }, webUtils: { getPathForFile: () => "G:/Drive/test.docx" } }),
  });
  await bridge.getAppInfo();
  expect(invoke).toHaveBeenLastCalledWith("desktop:app-info");
  await bridge.documentSettings(); await bridge.chooseDocumentRoot(); await bridge.chooseDocuments(); await bridge.droppedDocuments([{}]); await bridge.openDocument("test.docx");
  expect(invoke).toHaveBeenLastCalledWith("documents:open", "test.docx");
});
