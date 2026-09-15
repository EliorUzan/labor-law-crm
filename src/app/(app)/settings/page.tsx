import { headers } from "next/headers";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { DocumentSettings } from "@/modules/documents/settings";

function callbackUrl(headersList: Headers) {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") === "http" ? "http" : "https";
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return "https://<כתובת-המערכת>/api/documents/google/callback";
  return `${protocol}://${host}/api/documents/google/callback`;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ drive?: string }> }) {
  await requireAuthenticatedUserId();
  const { drive } = await searchParams;
  return <div className="space-y-5"><h1 className="text-3xl font-bold">הגדרות</h1><DocumentSettings oauthStatus={drive} callbackUrl={callbackUrl(await headers())} /></div>;
}
