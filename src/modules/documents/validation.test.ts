import { describe, expect, it } from "vitest";
import { documentReferenceSchema, getSafeHttpsUrl } from "./validation";

describe("Document reference validation", () => {
  it("requires only display name and location while trimming optional fields", () => {
    const parsed = documentReferenceSchema.parse({ displayName: "  הסכם העסקה  ", location: " C:\\Cases\\agreement.pdf ", category: " ", provider: "", notes: " " });
    expect(parsed).toEqual({ displayName: "הסכם העסקה", location: "C:\\Cases\\agreement.pdf", category: null, provider: null, notes: null });
  });

  it("rejects blank required values", () => {
    expect(documentReferenceSchema.safeParse({ displayName: " ", location: "" }).success).toBe(false);
  });

  it("only makes ordinary credential-free HTTPS locations actionable", () => {
    expect(getSafeHttpsUrl("https://drive.google.com/file/d/123")).toBe("https://drive.google.com/file/d/123");
    for (const value of ["javascript:alert(1)", "file:///C:/Cases/claim.pdf", "http://example.com", "https://user:secret@example.com", "C:\\Cases\\claim.pdf"]) {
      expect(getSafeHttpsUrl(value)).toBeNull();
    }
  });
});
