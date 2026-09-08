import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { clientObligations, deadlines } from "@/db/schema";

const migration = readFileSync(new URL("./0003_optional_obligation_deadline.sql", import.meta.url), "utf8");

describe("optional obligation Deadline migration", () => {
  it("allows an owned Deadline without a separately selected Matter", () => {
    expect(migration).toContain('DROP CONSTRAINT "client_obligations_owner_matter_deadline_fk"');
    expect(migration).toContain('DROP CONSTRAINT "client_obligations_deadline_requires_matter"');
    expect(migration).toContain('FOREIGN KEY ("owner_user_id","deadline_id")');
    expect(migration).toContain('REFERENCES "public"."deadlines"("owner_user_id","id")');
    const obligationConfig = getTableConfig(clientObligations);
    expect(obligationConfig.checks.map((check) => check.name)).not.toContain("client_obligations_deadline_requires_matter");
    expect(obligationConfig.foreignKeys.find((key) => key.getName() === "client_obligations_owner_deadline_fk")?.reference().columns.map((column) => column.name))
      .toEqual(["owner_user_id", "deadline_id"]);
    expect(getTableConfig(deadlines).uniqueConstraints.map((constraint) => constraint.name)).toContain("deadlines_owner_user_id_id_unique");
  });
});
