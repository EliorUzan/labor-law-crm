import { describe, expect, it, vi } from "vitest";
import { getCrmPlatformCapabilities, webBridgeInfo } from "./desktop-bridge";

describe("desktop capability adapter", () => {
  it("uses safe web capabilities when Electron is absent", async () => {
    expect(await getCrmPlatformCapabilities()).toEqual(webBridgeInfo);
  });

  it("accepts only the narrow validated Electron handshake", async () => {
    window.crmDesktop = {
      getBridgeInfo: vi.fn().mockResolvedValue({
        platform: "desktop", bridgeVersion: "0.1.0", canOpenLocalFiles: false,
        canRevealInFinder: false, canChooseLocalRoot: false,
      }),
    };
    await expect(getCrmPlatformCapabilities()).resolves.toMatchObject({ platform: "desktop", bridgeVersion: "0.1.0" });
    delete window.crmDesktop;
  });
});
