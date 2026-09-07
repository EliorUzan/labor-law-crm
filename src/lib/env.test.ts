import { describe, expect, it } from "vitest";

import { getDatabaseUrl } from "./env";

describe("getDatabaseUrl", () => {
  it("rejects a missing database URL", () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    expect(() => getDatabaseUrl()).toThrow();

    if (original === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = original;
    }
  });
});
