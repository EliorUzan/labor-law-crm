import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/env";

/**
 * Creates a server-only database handle. Keep database access in server code;
 * schemas and migrations will be introduced with the database/auth module.
 */
export function createDatabaseClient() {
  const client = postgres(getDatabaseUrl(), { prepare: false });

  return drizzle({ client });
}
