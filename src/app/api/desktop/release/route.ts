import { requireAuthenticatedUserId } from "@/lib/auth";
import { getDesktopRelease } from "@/modules/desktop-release/config";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAuthenticatedUserId();
  return Response.json(getDesktopRelease(), { headers: { "Cache-Control": "private, no-store" } });
}
