import "server-only";

import { and, asc, eq, ilike, or } from "drizzle-orm";

import { createDatabaseClient } from "@/db/client";
import { clients, matterHistory, matterNotes, matters } from "@/db/schema";

const RESULT_LIMIT = 12;

function patternFor(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

export type SearchResults = {
  clients: Array<{ id: string; name: string; phone: string | null; email: string | null }>;
  matters: Array<{ id: string; title: string; caseNumber: string | null; clientName: string }>;
  history: Array<{ id: string; matterId: string; title: string; matterTitle: string; clientName: string }>;
  notes: Array<{ id: string; matterId: string; content: string; matterTitle: string; clientName: string }>;
};

/** Small, owner-scoped PostgreSQL search for the records the lawyer reaches most often. */
export async function searchRecords(ownerUserId: string, rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim().slice(0, 200);
  const empty: SearchResults = { clients: [], matters: [], history: [], notes: [] };
  if (!query) return empty;

  const pattern = patternFor(query);
  const database = createDatabaseClient();
  const [clientRows, matterRows, historyRows, noteRows] = await Promise.all([
    database.select({ id: clients.id, name: clients.name, phone: clients.phone, email: clients.email })
      .from(clients)
      .where(and(eq(clients.ownerUserId, ownerUserId), or(ilike(clients.name, pattern), ilike(clients.phone, pattern), ilike(clients.email, pattern))))
      .orderBy(asc(clients.name), asc(clients.id)).limit(RESULT_LIMIT),
    database.select({ id: matters.id, title: matters.title, caseNumber: matters.caseNumber, clientName: clients.name })
      .from(matters).innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(and(eq(matters.ownerUserId, ownerUserId), or(
        ilike(matters.title, pattern), ilike(matters.caseNumber, pattern), ilike(matters.opposingParty, pattern),
        ilike(matters.opposingAttorneyName, pattern), ilike(matters.courtOrTribunal, pattern),
      ))).orderBy(asc(matters.title), asc(matters.id)).limit(RESULT_LIMIT),
    database.select({ id: matterHistory.id, matterId: matters.id, title: matterHistory.title, matterTitle: matters.title, clientName: clients.name })
      .from(matterHistory).innerJoin(matters, and(eq(matters.id, matterHistory.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(and(eq(matterHistory.ownerUserId, ownerUserId), or(ilike(matterHistory.title, pattern), ilike(matterHistory.description, pattern))))
      .orderBy(asc(matterHistory.eventDate), asc(matterHistory.id)).limit(RESULT_LIMIT),
    database.select({ id: matterNotes.id, matterId: matters.id, content: matterNotes.content, matterTitle: matters.title, clientName: clients.name })
      .from(matterNotes).innerJoin(matters, and(eq(matters.id, matterNotes.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(and(eq(matterNotes.ownerUserId, ownerUserId), ilike(matterNotes.content, pattern)))
      .orderBy(asc(matterNotes.id)).limit(RESULT_LIMIT),
  ]);
  return { clients: clientRows, matters: matterRows, history: historyRows, notes: noteRows };
}
