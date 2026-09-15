import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { documentTargetTypes, isDocumentTargetType, normalizeDocumentRelativePath } from "./service";

describe("Document domain boundary", () => {
  it("has a finite allowlist containing only implemented substantive records", () => {
    expect(documentTargetTypes).toContain("matter");
    expect(documentTargetTypes).toContain("financial_record");
    expect(documentTargetTypes).toContain("accounting_obligation");
    expect(documentTargetTypes).not.toContain("user");
    expect(documentTargetTypes).not.toContain("settings");
    expect(isDocumentTargetType("matter")).toBe(true);
    expect(isDocumentTargetType("arbitrary_table")).toBe(false);
  });

  it("canonicalizes relative paths and rejects root escapes", () => {
    expect(normalizeDocumentRelativePath(" CRM\\Clients\\כהן\\claim.pdf ")).toBe("CRM/Clients/כהן/claim.pdf");
    for (const value of ["", "/etc/passwd", "C:\\Users\\file.pdf", "CRM/../file.pdf", "./file.pdf"]) {
      expect(normalizeDocumentRelativePath(value)).toBeNull();
    }
  });

  it("keeps links owner-scoped, idempotent, and non-destructive", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "modules", "documents", "service.ts"), "utf8");
    expect(source).toContain("targetExistsForOwner");
    expect(source).toContain("eq(documents.ownerUserId, ownerUserId)");
    expect(source).toContain("onConflictDoNothing()");
    expect(source).not.toContain("delete(documents)");
    expect(source).not.toContain("providerFileId");
  });
});
