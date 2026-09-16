import { z } from "zod";

// Distribution supports stable major.minor.patch releases only.
export const desktopVersionSchema = z.string().max(50)
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
  .refine((value) => value.split(".").every((part) => Number.isSafeInteger(Number(part))));

export function compareDesktopVersions(installed: string, latest: string): -1 | 0 | 1 | null {
  if (!desktopVersionSchema.safeParse(installed).success || !desktopVersionSchema.safeParse(latest).success) return null;
  const left = installed.split(".").map(Number);
  const right = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }
  return 0;
}

export const desktopAppInfoSchema = z.object({
  version: desktopVersionSchema,
  platform: z.enum(["win32", "darwin"]),
  arch: z.enum(["x64", "arm64"]),
});
export type DesktopAppInfo = z.infer<typeof desktopAppInfoSchema>;

export type DesktopDetection =
  | { kind: "web" }
  | { kind: "unknown" }
  | { kind: "desktop"; info: DesktopAppInfo };

export async function detectDesktopVersion(): Promise<DesktopDetection> {
  if (typeof window === "undefined" || !window.crmDesktop) return { kind: "web" };
  if (!window.crmDesktop.getAppInfo) return { kind: "unknown" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      window.crmDesktop.getAppInfo(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 5000); }),
    ]);
    const parsed = desktopAppInfoSchema.safeParse(value);
    return parsed.success ? { kind: "desktop", info: parsed.data } : { kind: "unknown" };
  } catch {
    return { kind: "unknown" };
  } finally {
    clearTimeout(timer);
  }
}
