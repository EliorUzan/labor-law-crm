import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const authenticatedClaimsSchema = z.object({
  sub: z.string().uuid(),
});

/**
 * Returns a verified Supabase user ID, or null when the request has no valid
 * authenticated session. CRM reads and writes must scope by this value.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    return null;
  }

  const parsedClaims = authenticatedClaimsSchema.safeParse(data?.claims);
  return parsedClaims.success ? parsedClaims.data.sub : null;
}

/** Redirects requests without a verified Supabase identity to the login page. */
export async function requireAuthenticatedUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    redirect("/login");
  }

  return userId;
}
