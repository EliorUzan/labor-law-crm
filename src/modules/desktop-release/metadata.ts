import { z } from "zod";
import { desktopVersionSchema } from "./version";

const httpsUrl = z.url().max(2000).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
});

export const desktopReleaseSchema = z.object({
  version: desktopVersionSchema,
  downloads: z.object({ windows: httpsUrl, macArm64: httpsUrl, macX64: httpsUrl }),
});
export type DesktopRelease = z.infer<typeof desktopReleaseSchema>;

export function parseDesktopReleaseConfig(version: unknown, baseUrl: unknown): DesktopRelease | null {
  const validVersion = desktopVersionSchema.safeParse(version);
  const validBase = httpsUrl.safeParse(baseUrl);
  if (!validVersion.success || !validBase.success) return null;
  const prefix = `${validBase.data.replace(/\/$/, "")}/Labor-Law-CRM-${validVersion.data}`;
  const result = desktopReleaseSchema.safeParse({
    version: validVersion.data,
    downloads: {
      windows: `${prefix}-windows-x64-setup.exe`,
      macArm64: `${prefix}-macos-arm64.zip`,
      macX64: `${prefix}-macos-x64.zip`,
    },
  });
  return result.success ? result.data : null;
}
