import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0005_financial_integrity.sql", "utf8");

describe("financial integrity migration", () => {
  it("prevents non-positive monetary values even outside application validation", () => {
    for (const table of ["financial_records", "manual_income", "office_expenses", "trust_transactions", "accounting_liabilities", "tax_payments"]) {
      expect(migration).toContain(`ALTER TABLE "${table}" ADD CONSTRAINT`);
      expect(migration).toContain("CHECK (\"amount\" > 0)");
    }
  });
});
