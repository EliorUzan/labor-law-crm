import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { createDatabaseClient } from "@/db/client";
import { documentDriveConnections } from "@/db/schema";
import { connection, driveApi, driveConfig, exchangeTokens, GoogleDriveError, seal, unseal } from "@/modules/documents/google-drive";

export async function GET(request: Request) {
  const owner = await requireAuthenticatedUserId();
  const config = driveConfig();
  const jar = await cookies();
  const cookie = jar.get("crm-drive-oauth")?.value;
  jar.delete("crm-drive-oauth");
  const redirect = (status: string) => NextResponse.redirect(`${config.origin}/settings?drive=${status}`);
  let stage = "session-expired";
  try {
    const saved = z.object({ owner: z.uuid(), state: z.string(), expires: z.number() }).parse(unseal(cookie ?? ""));
    const url = new URL(request.url);
    if (saved.owner !== owner || saved.expires < Date.now() || saved.state !== url.searchParams.get("state")) return redirect("session-expired");
    if (url.searchParams.has("error") || !url.searchParams.get("code")) return redirect("consent-denied");
    stage = "token-exchange";
    const tokens = await exchangeTokens({ grant_type: "authorization_code", code: url.searchParams.get("code")!, redirect_uri: config.callback });
    stage = "drive-access";
    const account = z.object({ user: z.object({ permissionId: z.string() }) }).parse(await driveApi(tokens.access_token)("about?fields=user(permissionId)"));
    stage = "save-failed";
    const existing = await connection(owner);
    // Switching accounts would silently reinterpret existing root-relative paths.
    if (existing && existing.googleAccountId !== account.user.permissionId) return redirect("account-mismatch");
    if (!tokens.refresh_token && !existing) return redirect("refresh-missing");
    const refreshToken = tokens.refresh_token ? seal(tokens.refresh_token) : existing!.refreshToken;
    const db = createDatabaseClient();
    if (existing) await db.update(documentDriveConnections).set({ refreshToken, updatedAt: new Date() }).where(eq(documentDriveConnections.ownerUserId, owner));
    else await db.insert(documentDriveConnections).values({ ownerUserId: owner, refreshToken, googleAccountId: account.user.permissionId });
    return redirect("connected");
  } catch (error) {
    // Only fixed diagnostic codes: provider bodies, auth codes and tokens stay private.
    const reason = error instanceof GoogleDriveError ? error.reason : stage;
    console.error("Google Drive connection failed:", reason);
    return redirect(reason);
  }
}
