import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { unseal } from "./google-drive";

export const proofSchema = z.object({ owner: z.uuid(), rootId: z.string(), name: z.string().regex(/^\.crm-verification-[a-f0-9]{32}\.txt$/), content: z.string().regex(/^[a-f0-9]{64}$/), fileId: z.string(), expires: z.number() });
export async function rootProof(owner: string, rootId: string | null) {
  try {
    const cookie = (await cookies()).get("crm-drive-proof")?.value;
    if (!cookie) return null;
    const proof = proofSchema.parse(unseal(cookie));
    return proof.owner === owner && proof.rootId === rootId && proof.expires > Date.now() ? proof : null;
  } catch { return null; }
}
