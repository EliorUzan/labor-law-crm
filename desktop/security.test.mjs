import { describe, expect, it } from "vitest";
import security from "./security.cjs";

const { isApprovedCrmUrl, isCrmNavigation, isSafeExternalUrl, resolveCrmUrl } = security;

describe("Electron URL boundary", () => {
  it("allows only local HTTP development CRM URLs and HTTPS production CRM URLs", () => {
    expect(isApprovedCrmUrl("http://localhost:3000", true)).toBe(true);
    expect(isApprovedCrmUrl("http://evil.example", true)).toBe(false);
    expect(isApprovedCrmUrl("https://crm.example.com", false)).toBe(true);
    expect(isApprovedCrmUrl("http://crm.example.com", false)).toBe(false);
    expect(resolveCrmUrl({ NODE_ENV: "production", CRM_DESKTOP_URL: "https://crm.example.com" }).origin).toBe("https://crm.example.com");
  });

  it("keeps privileged navigation on the exact configured CRM origin", () => {
    const crmUrl = new URL("https://crm.example.com");
    expect(isCrmNavigation("https://crm.example.com/matters/1", crmUrl)).toBe(true);
    expect(isCrmNavigation("https://crm.example.com.attacker.test", crmUrl)).toBe(false);
    expect(isSafeExternalUrl("https://drive.google.com/file/d/1")).toBe(true);
    expect(isSafeExternalUrl("http://example.test")).toBe(false);
    expect(isSafeExternalUrl("file:///Users/lawyer/private.docx")).toBe(false);
  });
});
