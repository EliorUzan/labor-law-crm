import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(process.cwd(), "src", "db", "migrations", "0001_moaning_doomsday.sql");

describe("Matter Note migration", () => {
  it("preserves non-empty legacy Matter notes before dropping the legacy column", async () => {
    const migration = await readFile(migrationPath, "utf8");
    const preservation = migration.indexOf('INSERT INTO "matter_notes"');
    const removal = migration.indexOf('ALTER TABLE "matters" DROP COLUMN "notes"');
    expect(preservation).toBeGreaterThan(-1);
    expect(removal).toBeGreaterThan(preservation);
    expect(migration).toContain('SELECT "owner_user_id", "id", "notes", "updated_at", "updated_at"');
    expect(migration).toContain('WHERE "notes" IS NOT NULL AND btrim("notes") <> \'\'');
  });
  it("enables the same authenticated-owner RLS model as the existing CRM tables", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain('ALTER TABLE "matter_notes" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "matter_notes_owner_access"');
    expect(migration).toContain('WITH CHECK ((SELECT auth.uid()) = "owner_user_id")');
  });
});
