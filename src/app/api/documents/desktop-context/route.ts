import { getAuthenticatedUserId } from "@/lib/auth";
import { connection } from "@/modules/documents/google-drive";
import { rootProof } from "@/modules/documents/root-proof";

export async function GET() {
  const owner = await getAuthenticatedUserId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const drive = await connection(owner);
  if (!drive?.rootId) return Response.json({ error: "Drive root missing" }, { status: 409 });
  return Response.json({ ownerUserId: owner, rootId: drive.rootId, proof: await rootProof(owner, drive.rootId) }, { headers: { "Cache-Control": "no-store" } });
}
