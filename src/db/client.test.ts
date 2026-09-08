import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  drizzle: vi.fn(() => ({ execute: vi.fn() })),
  getDatabaseUrl: vi.fn(() => "postgres://example.test/database"),
  postgres: vi.fn(() => ({ end: vi.fn() })),
}));

vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: mocks.drizzle }));
vi.mock("postgres", () => ({ default: mocks.postgres }));
vi.mock("@/lib/env", () => ({ getDatabaseUrl: mocks.getDatabaseUrl }));

import { createDatabaseClient } from "./client";

describe("database client", () => {
  it("reuses one bounded connection pool for repeated application requests", () => {
    const firstClient = createDatabaseClient();
    const secondClient = createDatabaseClient();

    expect(firstClient).toBe(secondClient);
    expect(mocks.postgres).toHaveBeenCalledTimes(1);
    expect(mocks.postgres).toHaveBeenCalledWith("postgres://example.test/database", {
      idle_timeout: 20,
      max: 1,
      prepare: false,
    });
  });
});
