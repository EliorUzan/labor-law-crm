import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { clients, matters, matterHistory, matterNotes } from "@/db/schema";
import { recordIdSchema } from "@/modules/clients/validation";

export async function getMatter(ownerUserId: string, matterId: string) {
  if (!recordIdSchema.safeParse(matterId).success) return null;
  const [result] = await createDatabaseClient().select({ matter: matters, client: { id: clients.id, name: clients.name } })
    .from(matters).innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
    .where(and(eq(matters.id, matterId), eq(matters.ownerUserId, ownerUserId))).limit(1);
  return result ?? null;
}

export async function getMatterDetail(ownerUserId: string, matterId: string) {
  const result = await getMatter(ownerUserId, matterId);
  if (!result) return null;
  const database = createDatabaseClient();
  const [history, notes] = await Promise.all([
    database.select({ id: matterHistory.id, eventDate: matterHistory.eventDate,
      title: matterHistory.title, description: matterHistory.description })
      .from(matterHistory)
      .innerJoin(matters, and(eq(matters.id, matterHistory.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(and(eq(matterHistory.ownerUserId, ownerUserId), eq(matterHistory.matterId, matterId)))
      .orderBy(asc(matterHistory.eventDate), asc(matterHistory.createdAt), asc(matterHistory.id)),
    database.select({ id: matterNotes.id, content: matterNotes.content, createdAt: matterNotes.createdAt })
      .from(matterNotes)
      .innerJoin(matters, and(eq(matters.id, matterNotes.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(and(eq(matterNotes.ownerUserId, ownerUserId), eq(matterNotes.matterId, matterId)))
      .orderBy(desc(matterNotes.createdAt), desc(matterNotes.id)),
  ]);
  return { ...result, history, notes };
}

export type MatterDetail = NonNullable<Awaited<ReturnType<typeof getMatterDetail>>>;
