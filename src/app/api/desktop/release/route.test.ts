// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: vi.fn().mockResolvedValue("owner") }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("requires authentication and returns uncached configured release metadata", async () => {
  vi.stubEnv("DESKTOP_RELEASE_VERSION", "0.1.0");
  vi.stubEnv("DESKTOP_DOWNLOAD_BASE_URL", "https://downloads.example/desktop-v0.1.0");
  const response = await GET();
  expect(requireAuthenticatedUserId).toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({ version: "0.1.0", downloads: { windows: "https://downloads.example/desktop-v0.1.0/Labor-Law-CRM-0.1.0-windows-x64-setup.exe" } });
});
it("returns no advertised release until downloads are configured", async () => {
  vi.stubEnv("DESKTOP_RELEASE_VERSION", "");
  vi.stubEnv("DESKTOP_DOWNLOAD_BASE_URL", "");
  expect(await (await GET()).json()).toBeNull();
});
it("does not return metadata when authentication fails", async () => {
  vi.mocked(requireAuthenticatedUserId).mockRejectedValueOnce(new Error("unauthenticated"));
  await expect(GET()).rejects.toThrow("unauthenticated");
});
