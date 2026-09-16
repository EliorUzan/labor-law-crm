// @vitest-environment node
import { describe, expect, it } from "vitest";
import appInfo from "./app-info.cjs";
import security from "./security.cjs";

describe("packaged desktop identity", () => {
  it("uses the bundled HTTPS URL even with development or hostile environment overrides", () => {
    const env = { NODE_ENV: "development", ELECTRON_START_URL: "http://localhost:9999", CRM_DESKTOP_URL: "https://wrong.example" };
    expect(security.resolveCrmUrl(env, { crmUrl: "https://labor-law-crm.vercel.app" }, true).origin).toBe("https://labor-law-crm.vercel.app");
    for (const config of [null, {}, { crmUrl: "http://localhost:3000" }, { crmUrl: "https://user:pass@example.com" }]) {
      expect(() => security.resolveCrmUrl(env, config, true)).toThrow();
    }
  });

  it("reports the installed app version, independently of bridge version, only to the CRM main frame", () => {
    let handler;
    appInfo.installAppInfoHandler({
      ipcMain: { handle: (name, fn) => { expect(name).toBe("desktop:app-info"); handler = fn; } },
      app: { getVersion: () => "2.10.3" }, crmUrl: new URL("https://crm.example"),
      platform: "darwin", arch: "arm64",
    });
    const frame = { url: "https://crm.example/downloads" };
    expect(handler({ senderFrame: frame, sender: { mainFrame: frame } })).toEqual({ version: "2.10.3", platform: "darwin", arch: "arm64" });
    expect(() => handler({ senderFrame: frame, sender: { mainFrame: {} } })).toThrow();
    const hostile = { url: "https://crm.example.evil.test/" };
    expect(() => handler({ senderFrame: hostile, sender: { mainFrame: hostile } })).toThrow();
    expect(() => handler({ senderFrame: null, sender: { mainFrame: frame } })).toThrow();
  });
});
