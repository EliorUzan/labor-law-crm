import { afterEach, describe, expect, it, vi } from "vitest";
import { compareDesktopVersions, detectDesktopVersion } from "./version";
import { parseDesktopReleaseConfig } from "./metadata";

afterEach(() => { delete window.crmDesktop; vi.useRealTimers(); });
function bridge(getAppInfo?: () => Promise<unknown>) {
  window.crmDesktop = {
    getAppInfo, getBridgeInfo: vi.fn(), documentSettings: vi.fn(), chooseDocumentRoot: vi.fn(),
    chooseDocuments: vi.fn(), droppedDocuments: vi.fn(), openDocument: vi.fn(),
  };
}
describe("stable desktop version comparison", () => {
  it.each([
    ["1.9.0", "1.10.0", -1], ["1.0.9", "1.0.10", -1], ["2.0.0", "1.99.99", 1],
    ["0.1.0", "0.1.0", 0], ["0.1.1", "0.1.0", 1], ["0.9.9", "1.0.0", -1],
  ])("compares %s to %s numerically", (installed, latest, expected) => {
    expect(compareDesktopVersions(installed, latest)).toBe(expected);
  });
  it.each(["", "v1.0.0", "01.0.0", "1.0", "1.0.0-beta.1", "1.0.0+build", "1.0.0.0", "1.0.-1", "9007199254740992.0.0"])("rejects invalid or unsupported version %s", (version) => {
    expect(compareDesktopVersions(version, "1.0.0")).toBeNull();
    expect(compareDesktopVersions("1.0.0", version)).toBeNull();
  });
});
describe("desktop detection", () => {
  it("recognizes a browser without invoking Electron", async () => {
    expect(await detectDesktopVersion()).toEqual({ kind: "web" });
  });
  it("does not mistake an old bridge for the browser or use its bridgeVersion as the app version", async () => {
    bridge();
    expect(await detectDesktopVersion()).toEqual({ kind: "unknown" });
  });
  it("validates installed version, OS and architecture", async () => {
    bridge(async () => ({ version: "0.1.0", platform: "win32", arch: "x64" }));
    expect(await detectDesktopVersion()).toEqual({ kind: "desktop", info: { version: "0.1.0", platform: "win32", arch: "x64" } });
  });
  it.each([
    { version: "garbage", platform: "win32", arch: "x64" },
    { version: "1.0.0", platform: "web", arch: "x64" },
    { version: "1.0.0", platform: "darwin", arch: "unknown" },
    null,
  ])("handles malformed bridge values without claiming the app is current", async (value) => {
    bridge(async () => value);
    expect(await detectDesktopVersion()).toEqual({ kind: "unknown" });
  });
  it("handles rejected IPC", async () => {
    bridge(async () => { throw new Error("old process"); });
    expect(await detectDesktopVersion()).toEqual({ kind: "unknown" });
  });
  it("bounds an unresponsive bridge", async () => {
    vi.useFakeTimers();
    bridge(() => new Promise(() => {}));
    const result = detectDesktopVersion();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toEqual({ kind: "unknown" });
  });
});
describe("release configuration", () => {
  it("generates versioned artifact URLs from one explicit published version", () => {
    expect(parseDesktopReleaseConfig("1.10.0", "https://downloads.example/releases/desktop-v1.10.0/")).toEqual({
      version: "1.10.0", downloads: {
        windows: "https://downloads.example/releases/desktop-v1.10.0/Labor-Law-CRM-1.10.0-windows-x64-setup.exe",
        macArm64: "https://downloads.example/releases/desktop-v1.10.0/Labor-Law-CRM-1.10.0-macos-arm64.zip",
        macX64: "https://downloads.example/releases/desktop-v1.10.0/Labor-Law-CRM-1.10.0-macos-x64.zip",
      },
    });
  });
  it.each([undefined, "", "http://example.com", "javascript:alert(1)", "https://user:password@example.com", "https://example.com/?token=secret", "https://example.com/#fragment"])("disables unconfigured or unsafe download links (%s)", (url) => {
    expect(parseDesktopReleaseConfig("1.0.0", url)).toBeNull();
  });
  it("does not advertise an unpublished or invalid version", () => {
    expect(parseDesktopReleaseConfig(undefined, "https://example.com")).toBeNull();
    expect(parseDesktopReleaseConfig("1.0.0-beta.1", "https://example.com")).toBeNull();
  });
});
