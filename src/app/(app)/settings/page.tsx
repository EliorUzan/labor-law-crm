import { requireAuthenticatedUserId } from "@/lib/auth";
import { DocumentSettings } from "@/modules/documents/settings";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ drive?: string }> }) {
  await requireAuthenticatedUserId();
  const { drive } = await searchParams;
  return <div className="space-y-5"><h1 className="text-3xl font-bold">הגדרות</h1><DocumentSettings oauthStatus={drive} /></div>;
}
