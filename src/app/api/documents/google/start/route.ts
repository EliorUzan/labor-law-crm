import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { driveConfig, seal } from "@/modules/documents/google-drive";

export async function GET() {
  const owner = await requireAuthenticatedUserId();
  const config = driveConfig();
  const state = randomBytes(32).toString("hex");
  (await cookies()).set("crm-drive-oauth", seal({ owner, state, expires: Date.now() + 600000 }), { httpOnly: true, secure: config.origin.startsWith("https:"), sameSite: "lax", path: "/api/documents/google", maxAge: 600 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback, response_type: "code", scope: "https://www.googleapis.com/auth/drive", access_type: "offline", prompt: "consent", state }).toString();
  return NextResponse.redirect(url);
}
