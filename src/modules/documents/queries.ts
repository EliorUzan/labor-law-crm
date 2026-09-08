import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { clients, documentReferences, matters } from "@/db/schema";
import { recordIdSchema } from "@/modules/clients/validation";

export async function getMatterDocumentReferences(ownerUserId: string, matterId: string) {
  if (!recordIdSchema.safeParse(matterId).success) return [];

  return createDatabaseClient().select({
    id: documentReferences.id,
    displayName: documentReferences.displayName,
    location: documentReferences.location,
    category: documentReferences.category,
    provider: documentReferences.provider,
    notes: documentReferences.notes,
    updatedAt: documentReferences.updatedAt,
  }).from(documentReferences)
    .innerJoin(matters, and(eq(matters.id, documentReferences.matterId), eq(matters.ownerUserId, ownerUserId)))
    .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
    .where(and(eq(documentReferences.ownerUserId, ownerUserId), eq(documentReferences.matterId, matterId)))
    .orderBy(desc(documentReferences.createdAt), desc(documentReferences.id));
}

export type MatterDocumentReferences = Awaited<ReturnType<typeof getMatterDocumentReferences>>;
