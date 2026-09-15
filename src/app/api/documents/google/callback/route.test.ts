// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: { get: vi.fn(), delete: vi.fn() },
  owner: "00000000-0000-4000-8000-000000000001",
  exchange: vi.fn(), api: vi.fn(), connection: vi.fn(), insert: vi.fn(), unseal: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookies }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: async () => mocks.owner }));
vi.mock("@/db/client", () => ({ createDatabaseClient: () => ({ insert: () => ({ values: mocks.insert }) }) }));
vi.mock("@/modules/documents/google-drive", async (original) => {
  const actual = await original<typeof import("@/modules/documents/google-drive")>();
  return { ...actual, driveConfig: () => ({ origin: "http://localhost:3000", callback: "http://localhost:3000/api/documents/google/callback" }),
    exchangeTokens: mocks.exchange, driveApi: () => mocks.api, connection: mocks.connection, seal: () => "encrypted-token", unseal: mocks.unseal };
});
import { GoogleDriveError } from "@/modules/documents/google-drive";
import { GET } from "./route";

const callback = (query = "state=expected&code=private-code") => GET(new Request(`http://localhost:3000/api/documents/google/callback?${query}`));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookies.get.mockReturnValue({ value: "encrypted-state" });
  mocks.unseal.mockReturnValue({ owner: mocks.owner, state: "expected", expires: Date.now() + 60000 });
  mocks.exchange.mockResolvedValue({ access_token: "private-access", refresh_token: "private-refresh" });
  mocks.api.mockResolvedValue({ user: { permissionId: "account-1" } });
  mocks.connection.mockResolvedValue(null);
  mocks.insert.mockResolvedValue(undefined);
});

describe("Drive OAuth callback", () => {
  it("stores the encrypted connection after checking Drive access", async () => {
    const response = await callback();
    expect(response.headers.get("location")).toBe("http://localhost:3000/settings?drive=connected");
    expect(mocks.insert).toHaveBeenCalledWith({ ownerUserId: mocks.owner, refreshToken: "encrypted-token", googleAccountId: "account-1" });
    expect(mocks.cookies.delete).toHaveBeenCalledWith("crm-drive-oauth");
  });
  it.each([
    { state: "wrong" }, { owner: "00000000-0000-4000-8000-000000000002" }, { expires: 0 },
  ])("rejects invalid state, owner or expiry before exchanging the code", async (change) => {
    mocks.unseal.mockReturnValue({ owner: mocks.owner, state: "expected", expires: Date.now() + 60000, ...change });
    expect((await callback()).headers.get("location")).toContain("drive=session-expired");
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("reports a disabled API separately from a successful Google consent", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.api.mockRejectedValue(new GoogleDriveError("private-provider-body", "api-disabled"));
    expect((await callback()).headers.get("location")).toBe("http://localhost:3000/settings?drive=api-disabled");
    expect(log).toHaveBeenCalledWith("Google Drive connection failed:", "api-disabled");
    expect(mocks.insert).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("distinguishes a database failure without logging SQL parameters or tokens", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.insert.mockRejectedValue(new Error("query contains private-refresh"));
    expect((await callback()).headers.get("location")).toContain("drive=save-failed");
    expect(log).toHaveBeenCalledWith("Google Drive connection failed:", "save-failed");
    log.mockRestore();
  });
  it("keeps the existing connection when a different Google account is selected", async () => {
    mocks.connection.mockResolvedValue({ googleAccountId: "other-account", refreshToken: "existing-encrypted-token" });
    expect((await callback()).headers.get("location")).toContain("drive=account-mismatch");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
