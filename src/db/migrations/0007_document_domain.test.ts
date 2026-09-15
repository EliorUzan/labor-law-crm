import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrations = path.join(process.cwd(), "src", "db", "migrations");

describe("Filesystem-first document migrations", () => {
  it("creates documents with canonical relative paths and finite links", async () => {
    const migration = await readFile(path.join(migrations, "0007_document_domain.sql"), "utf8");
    expect(migration).toContain('"relative_path" text NOT NULL');
    expect(migration).toContain('"documents_owner_relative_path_unique"');
    expect(migration).toContain('"document_links_document_target_unique"');
    expect(migration).toContain('CREATE POLICY "document_links_owner_access"');
    expect(migration).not.toContain("legacy_reference");
    expect(migration).not.toContain("provider_file_id");
    expect(migration).not.toContain("managed_drive_folders");
  });

  it("removes V1 references and repairs the discarded provider model without migration", async () => {
    const migration = await readFile(path.join(migrations, "0008_filesystem_first_document_correction.sql"), "utf8");
    expect(migration).toContain('DROP TABLE IF EXISTS "document_references"');
    expect(migration).toContain("column_name = 'provider_file_id'");
    expect(migration).toContain('DROP TABLE IF EXISTS "managed_drive_folders"');
    expect(migration).not.toContain("INSERT INTO");
  });
});
