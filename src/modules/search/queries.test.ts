import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

import { searchRecords } from "./queries";

const mock = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mock.database }));

const owner = "11111111-1111-4111-8111-111111111111";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();

beforeEach(() => {
  execute.mockReset().mockResolvedValue({ rows: [] });
  mock.database.mockReturnValue(drizzle(execute));
});

describe("global search", () => {
  it("does not query for an empty term", async () => {
    await expect(searchRecords(owner, "   ")).resolves.toEqual({ clients: [], matters: [], history: [], notes: [] });
    expect(execute).not.toHaveBeenCalled();
  });

  it("searches clients, Matters, history and notes with owner-scoped bound parameters", async () => {
    await searchRecords(owner, "כהן%_");
    expect(execute).toHaveBeenCalledTimes(4);
    for (const [sql, params] of execute.mock.calls) {
      expect(sql).toContain('"owner_user_id" =');
      expect(sql).toContain("ilike");
      expect(params).toContain(owner);
      expect(params).toContain("%כהן\\%\\_%");
      expect(sql).not.toContain("כהן");
    }
    expect(execute.mock.calls.some(([sql]) => sql.includes('"matter_history"'))).toBe(true);
    expect(execute.mock.calls.some(([sql]) => sql.includes('"matter_notes"'))).toBe(true);
  });
});
