import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/env";

function createUncachedDatabaseClient() {
  const client = postgres(getDatabaseUrl(), {
    // Supabase's session pool is deliberately small. Dashboard reads run in
    // parallel, so bound this process to one reusable database connection.
    idle_timeout: 20,
    max: 1,
    prepare: false,
  });

  return drizzle({ client });
}

const globalForDatabase = globalThis as typeof globalThis & {
  laborLawCrmDatabaseClient?: ReturnType<typeof createUncachedDatabaseClient>;
};

/**
 * Returns the single server-only database handle for this Next.js process.
 * Reusing it prevents development requests and hot reloads from exhausting the
 * finite Supabase session pool.
 */
export function createDatabaseClient() {
  globalForDatabase.laborLawCrmDatabaseClient ??= createUncachedDatabaseClient();
  return globalForDatabase.laborLawCrmDatabaseClient;
}
