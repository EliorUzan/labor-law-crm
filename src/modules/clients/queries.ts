import "server-only";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { clients, matters, clientObligations, financialRecords } from "@/db/schema";
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

export async function getClientDetail(ownerUserId: string, clientId: string) {
  const client = await getClient(ownerUserId, clientId);
  if (!client) return null;
  const database = createDatabaseClient();
  const [clientMatters, records, obligations, financialSummary] = await Promise.all([
    database.select({ id: matters.id, title: matters.title, status: matters.status, caseNumber: matters.caseNumber })
      .from(matters).where(and(eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, clientId)))
      .orderBy(desc(matters.updatedAt), asc(matters.id)),
    database.select({ id: financialRecords.id, type: financialRecords.type, amount: financialRecords.amount,
      recordDate: financialRecords.recordDate, description: financialRecords.description, matterId: financialRecords.matterId })
      .from(financialRecords).where(and(eq(financialRecords.ownerUserId, ownerUserId), eq(financialRecords.clientId, clientId)))
      .orderBy(desc(financialRecords.recordDate), desc(financialRecords.createdAt), desc(financialRecords.id)),
    database.select({ id: clientObligations.id, title: clientObligations.title, description: clientObligations.description,
      dueDate: clientObligations.dueDate, done: clientObligations.done, matterId: clientObligations.matterId })
      .from(clientObligations).where(and(eq(clientObligations.ownerUserId, ownerUserId), eq(clientObligations.clientId, clientId)))
      .orderBy(asc(clientObligations.done), asc(clientObligations.dueDate), desc(clientObligations.createdAt), asc(clientObligations.id)),
    getFinancialSummary(ownerUserId, clientId),
  ]);
  return { client, matters: clientMatters, records, obligations, financialSummary };
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;
