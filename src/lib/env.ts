import { z } from "zod";

const databaseUrlSchema = z.string().url();

/** Reads a server-only database connection string at the point it is needed. */
export function getDatabaseUrl(): string {
  return databaseUrlSchema.parse(process.env.DATABASE_URL);
}

const publicSupabaseSchema = z.object({
  url: z.string().url(),
  publishableKey: z.string().min(1),
});

/** Validates the browser-safe Supabase settings used by Supabase Auth. */
export function getPublicSupabaseConfig() {
  const config = publicSupabaseSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!config.success) {
    throw new Error(
      "Supabase Auth is not configured. Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the Next.js server.",
    );
  }

  return config.data;
}
