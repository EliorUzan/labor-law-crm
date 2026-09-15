import { z } from "zod";

const desktopBridgeInfoSchema = z.object({
  platform: z.literal("desktop"),
  bridgeVersion: z.string().min(1),
  canOpenLocalFiles: z.boolean(),
  canRevealInFinder: z.boolean(),
  canChooseLocalRoot: z.boolean(),
});

export type DesktopBridgeInfo = z.infer<typeof desktopBridgeInfoSchema>;

export const webBridgeInfo = {
  platform: "web",
  bridgeVersion: null,
  canOpenLocalFiles: false,
  canRevealInFinder: false,
  canChooseLocalRoot: false,
} as const;

export type CrmPlatformCapabilities = DesktopBridgeInfo | typeof webBridgeInfo;

/**
 * Reads the deliberately narrow Electron bridge without coupling shared React
 * UI to Electron globals. Browsers and malformed/unavailable bridges are web.
 */
export async function getCrmPlatformCapabilities(): Promise<CrmPlatformCapabilities> {
  if (typeof window === "undefined" || !window.crmDesktop) return webBridgeInfo;

  try {
    const result = desktopBridgeInfoSchema.safeParse(await window.crmDesktop.getBridgeInfo());
    return result.success ? result.data : webBridgeInfo;
  } catch {
    return webBridgeInfo;
  }
}
