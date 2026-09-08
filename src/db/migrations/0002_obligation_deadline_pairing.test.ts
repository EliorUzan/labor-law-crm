// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { clientObligations } from "../schema";

const migration = readFileSync(new URL("./0002_obligation_deadline_pairing.sql", import.meta.url), "utf8");
describe("Obligation Deadline migration", () => {
  it("adds only the optional association, restrictive composite FK, checks and index", () => {
    expect(migration).toContain('ADD COLUMN "deadline_id" uuid');
    expect(migration).toContain('FOREIGN KEY ("owner_user_id","matter_id","deadline_id")');
    expect(migration).toContain("ON DELETE restrict");
    expect(migration).not.toMatch(/DROP|TRUNCATE|DELETE FROM|CREATE TABLE/i);
    expect(clientObligations.deadlineId.notNull).toBe(false);
    // Current schema may evolve in a later migration; this test protects the
    // immutable migration content itself. The successor migration has its own
    // schema assertions.
    expect(getTableConfig(clientObligations).checks.map((check) => check.name)).toContain("client_obligations_one_date_source");
  });
});

// Opt-in integration test: only session-local temporary tables, never stored CRM tables.
describe.skipIf(process.env.CRM_DB_CONSTRAINT_TEST !== "1")("Pairing constraints on temporary PostgreSQL tables", () => {
  let connection: ReturnType<typeof postgres>;
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  beforeAll(() => {
    if (!process.env.DATABASE_URL) process.loadEnvFile(".env.local");
    connection = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, connect_timeout: 10 });
  });
  afterAll(async () => { await connection?.end({ timeout: 1 }); });
  it("preserves legacy rows, allows shared optional references and rejects null/cross-parent/owner/date conflicts", async () => {
    await connection.begin(async (tx) => {
      await tx.unsafe(`
        create temporary table clients(owner_user_id uuid, id uuid, unique(owner_user_id,id)) on commit drop;
        create temporary table matters(owner_user_id uuid, client_id uuid, id uuid,
          unique(owner_user_id,client_id,id), unique(owner_user_id,id),
          foreign key(owner_user_id,client_id) references clients(owner_user_id,id)) on commit drop;
        create temporary table deadlines(owner_user_id uuid, matter_id uuid, id uuid,
          unique(owner_user_id,matter_id,id), foreign key(owner_user_id,matter_id) references matters(owner_user_id,id)) on commit drop;
        create temporary table client_obligations(id uuid, owner_user_id uuid, client_id uuid, matter_id uuid, due_date date,
          foreign key(owner_user_id,client_id) references clients(owner_user_id,id),
          foreign key(owner_user_id,client_id,matter_id) references matters(owner_user_id,client_id,id)) on commit drop;
      `);
      await tx`insert into clients values (${id(1)}, ${id(2)}), (${id(1)}, ${id(3)}), (${id(9)}, ${id(10)})`;
      await tx`insert into matters values (${id(1)}, ${id(2)}, ${id(4)}), (${id(1)}, ${id(2)}, ${id(5)}), (${id(1)}, ${id(3)}, ${id(6)}), (${id(9)}, ${id(10)}, ${id(11)})`;
      await tx`insert into deadlines values (${id(1)}, ${id(4)}, ${id(7)}), (${id(1)}, ${id(5)}, ${id(8)}), (${id(9)}, ${id(11)}, ${id(12)})`;
      await tx`insert into client_obligations values (${id(20)}, ${id(1)}, ${id(2)}, null, '2026-09-14')`;
      // The generated migration references public.deadlines explicitly; redirect only
      // that reference to our temp copy, leaving all generated constraints unchanged.
      await tx.unsafe(migration.replaceAll('"public"."deadlines"', '"pg_temp"."deadlines"'));
      const [legacy] = await tx`select due_date::text, deadline_id from client_obligations where id = ${id(20)}`;
      expect(legacy).toEqual({ due_date: "2026-09-14", deadline_id: null });
      for (const [n, matter, deadline] of [[21, null, null], [22, id(4), null], [23, id(4), id(7)], [24, id(4), id(7)]] as const)
        await tx`insert into client_obligations(id,owner_user_id,client_id,matter_id,deadline_id) values (${id(n)},${id(1)},${id(2)},${matter},${deadline})`;
      for (const [matter, deadline, dueDate, code] of [
        [null, id(7), null, "23514"], // Deadline requires Matter.
        [id(5), id(7), null, "23503"], // Wrong Matter, same Client.
        [id(6), null, null, "23503"], // Matter belongs to another Client.
        [id(4), id(12), null, "23503"], // Other owner's Deadline.
        [id(4), id(7), "2026-09-16", "23514"], // Duplicate date source.
      ] as const) {
        await expect(tx.savepoint(async (sp) => {
          await sp`insert into client_obligations(id,owner_user_id,client_id,matter_id,deadline_id,due_date)
            values (${id(30)},${id(1)},${id(2)},${matter},${deadline},${dueDate})`;
        })).rejects.toMatchObject({ code });
      }
      await tx`update client_obligations set matter_id = null, deadline_id = null where id = ${id(23)}`;
      const [counts] = await tx`select (select count(*)::int from deadlines) as deadlines, count(*)::int as obligations from client_obligations`;
      expect(counts).toEqual({ deadlines: 3, obligations: 5 });
    });
  }, 20000);
});
