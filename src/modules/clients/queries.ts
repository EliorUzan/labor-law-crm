import "server-only";
import { aliasedTable, and, asc, desc, eq, ilike } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { clients, matters, deadlines, clientObligations, financialRecords } from "@/db/schema";
import { recordIdSchema } from "./validation";
import { getFinancialSummary } from "./financial-summary";

export async function listClients(ownerUserId: string, search = "") {
  // Treat SQL wildcard characters as literal name characters.
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  return createDatabaseClient().select({
    id: clients.id, name: clients.name, phone: clients.phone, email: clients.email, status: clients.status,
  }).from(clients).where(and(
    eq(clients.ownerUserId, ownerUserId), search ? ilike(clients.name, pattern) : undefined,
  )).orderBy(asc(clients.name), asc(clients.id));
}

export async function getClient(ownerUserId: string, clientId: string) {
  if (!recordIdSchema.safeParse(clientId).success) return null;
  const [client] = await createDatabaseClient().select().from(clients)
    .where(and(eq(clients.ownerUserId, ownerUserId), eq(clients.id, clientId))).limit(1);
  return client ?? null;
}

/** Also used before child inserts; composite FKs retain integrity during concurrent writes. */
export async function ownsClientMatter(ownerUserId: string, clientId: string, matterId: string | null) {
  if (!await getClient(ownerUserId, clientId)) return false;
  if (!matterId) return true;
  const [matter] = await createDatabaseClient().select({ id: matters.id }).from(matters).where(and(
    eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, clientId), eq(matters.id, matterId),
  )).limit(1);
  return Boolean(matter);
}

/** Verifies that a deadline belongs to this Client, with an optional matching Matter. */
export async function getClientDeadline(ownerUserId: string, clientId: string, deadlineId: string, matterId?: string | null) {
  if (!recordIdSchema.safeParse(deadlineId).success) return null;
  const [deadline] = await createDatabaseClient().select({ id: deadlines.id, matterId: deadlines.matterId })
    .from(deadlines)
    .innerJoin(matters, and(
      eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, clientId),
      matterId ? eq(matters.id, matterId) : undefined,
    ))
    .where(and(eq(deadlines.ownerUserId, ownerUserId), eq(deadlines.id, deadlineId))).limit(1);
  return deadline ?? null;
}

export async function getClientDetail(ownerUserId: string, clientId: string) {
  const client = await getClient(ownerUserId, clientId);
  if (!client) return null;
  const database = createDatabaseClient();
  const deadlineMatter = aliasedTable(matters, "client_deadline_matters");
  const [clientMatters, records, obligations, financialSummary, clientDeadlines] = await Promise.all([
    database.select({ id: matters.id, title: matters.title, status: matters.status, caseNumber: matters.caseNumber })
      .from(matters).where(and(eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, clientId)))
      .orderBy(desc(matters.updatedAt), asc(matters.id)),
    database.select({ id: financialRecords.id, type: financialRecords.type, amount: financialRecords.amount,
      recordDate: financialRecords.recordDate, description: financialRecords.description, matterId: financialRecords.matterId })
      .from(financialRecords).where(and(eq(financialRecords.ownerUserId, ownerUserId), eq(financialRecords.clientId, clientId)))
      .orderBy(desc(financialRecords.recordDate), desc(financialRecords.createdAt), desc(financialRecords.id)),
    database.select({ id: clientObligations.id, title: clientObligations.title, description: clientObligations.description,
      dueDate: clientObligations.dueDate, done: clientObligations.done, matterId: clientObligations.matterId,
      deadlineId: clientObligations.deadlineId, deadlineTitle: deadlines.title, deadlineAt: deadlines.deadlineAt,
      deadlineMatterId: deadlineMatter.id, deadlineMatterTitle: deadlineMatter.title, updatedAt: clientObligations.updatedAt })
      .from(clientObligations)
      .innerJoin(clients, and(eq(clients.id, clientObligations.clientId), eq(clients.ownerUserId, ownerUserId)))
      .leftJoin(matters, and(eq(matters.id, clientObligations.matterId), eq(matters.clientId, clientObligations.clientId), eq(matters.ownerUserId, ownerUserId)))
      .leftJoin(deadlines, and(eq(deadlines.id, clientObligations.deadlineId), eq(deadlines.ownerUserId, ownerUserId)))
      .leftJoin(deadlineMatter, and(eq(deadlineMatter.id, deadlines.matterId), eq(deadlineMatter.ownerUserId, ownerUserId), eq(deadlineMatter.clientId, clientObligations.clientId)))
      .where(and(eq(clientObligations.ownerUserId, ownerUserId), eq(clientObligations.clientId, clientId)))
      .orderBy(asc(clientObligations.done), asc(clientObligations.dueDate), desc(clientObligations.createdAt), asc(clientObligations.id)),
    getFinancialSummary(ownerUserId, clientId),
    database.select({ id: deadlines.id, matterId: deadlines.matterId, title: deadlines.title, deadlineAt: deadlines.deadlineAt })
      .from(deadlines)
      .innerJoin(matters, and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, clientId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(eq(deadlines.ownerUserId, ownerUserId)).orderBy(asc(deadlines.deadlineAt), asc(deadlines.id)),
  ]);
  return { client, matters: clientMatters, records, obligations, financialSummary, deadlines: clientDeadlines };
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;
