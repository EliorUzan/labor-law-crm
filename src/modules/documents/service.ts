import "server-only";

import { and, desc, eq, or } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import {
  accountingLiabilities, accountingObligations, clients, clientObligations, deadlines,
  documentLinks, documents, financialRecords, importantDates, manualIncome, matterHistory,
  matterNotes, matters, officeExpenses, tasks, taxPayments, trustTransactions,
} from "@/db/schema";
import { recordIdSchema } from "@/modules/clients/validation";
import { normalizeDocumentRelativePath } from "./validation";
export { normalizeDocumentRelativePath } from "./validation";

export const documentTargetTypes = [
  "client", "matter", "financial_record", "client_obligation", "task", "deadline",
  "important_date", "matter_history", "matter_note", "office_expense", "manual_income",
  "trust_transaction", "tax_payment", "accounting_liability", "accounting_obligation",
] as const;

export type DocumentTargetType = (typeof documentTargetTypes)[number];
export type DocumentTarget = { type: DocumentTargetType; id: string };
export type DocumentMetadataInput = {
  displayName: string;
  relativePath: string;
  driveFileId?: string | null;
  webUrl?: string | null;
  mimeType?: string | null;
  extension?: string | null;
  sizeBytes?: number | null;
  fileModifiedAt?: Date | null;
};

export function isDocumentTargetType(value: unknown): value is DocumentTargetType {
  return typeof value === "string" && (documentTargetTypes as readonly string[]).includes(value);
}

function validTarget(target: DocumentTarget): boolean {
  return isDocumentTargetType(target.type) && recordIdSchema.safeParse(target.id).success;
}

function validMetadata(input: DocumentMetadataInput) {
  return input.displayName.trim().length > 0 && input.displayName.trim().length <= 300
    && normalizeDocumentRelativePath(input.relativePath) !== null
    && (input.mimeType === undefined || input.mimeType === null || input.mimeType.length <= 255)
    && (input.extension === undefined || input.extension === null || input.extension.length <= 50)
    && (input.sizeBytes === undefined || input.sizeBytes === null || (Number.isSafeInteger(input.sizeBytes) && input.sizeBytes >= 0));
}

/** Polymorphic targets have no DB FK; this finite lookup is their ownership boundary. */
export async function targetExistsForOwner(ownerUserId: string, target: DocumentTarget): Promise<boolean> {
  if (!validTarget(target)) return false;
  const database = createDatabaseClient();
  const tableByType = {
    client: clients, matter: matters, financial_record: financialRecords,
    client_obligation: clientObligations, task: tasks, deadline: deadlines,
    important_date: importantDates, matter_history: matterHistory, matter_note: matterNotes,
    office_expense: officeExpenses, manual_income: manualIncome, trust_transaction: trustTransactions,
    tax_payment: taxPayments, accounting_liability: accountingLiabilities,
    accounting_obligation: accountingObligations,
  } as const;
  const table = tableByType[target.type];
  const [row] = await database.select({ id: table.id }).from(table)
    .where(and(eq(table.id, target.id), eq(table.ownerUserId, ownerUserId))).limit(1);
  return Boolean(row);
}

export async function getDocument(ownerUserId: string, documentId: string) {
  if (!recordIdSchema.safeParse(documentId).success) return null;
  const [document] = await createDatabaseClient().select().from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.ownerUserId, ownerUserId))).limit(1);
  return document ?? null;
}

export async function listDocumentsForTarget(ownerUserId: string, target: DocumentTarget) {
  if (!await targetExistsForOwner(ownerUserId, target)) return [];
  return createDatabaseClient().select({
    id: documents.id, displayName: documents.displayName, relativePath: documents.relativePath,
    driveFileId: documents.driveFileId, webUrl: documents.webUrl,
    mimeType: documents.mimeType, extension: documents.extension, sizeBytes: documents.sizeBytes,
    fileModifiedAt: documents.fileModifiedAt, updatedAt: documents.updatedAt,
  }).from(documentLinks)
    .innerJoin(documents, and(eq(documents.id, documentLinks.documentId), eq(documents.ownerUserId, ownerUserId)))
    .where(and(eq(documentLinks.targetType, target.type), eq(documentLinks.targetId, target.id)))
    .orderBy(desc(documents.createdAt), desc(documents.id));
}

/** Records metadata only after the desktop layer safely handles the real file. */
export async function createDocumentForTarget(ownerUserId: string, target: DocumentTarget, input: DocumentMetadataInput) {
  const relativePath = normalizeDocumentRelativePath(input.relativePath);
  if (!relativePath || !validMetadata(input) || !await targetExistsForOwner(ownerUserId, target)) return null;
  const database = createDatabaseClient();
  return database.transaction(async (transaction) => {
    // Reuse an existing physical file when attaching it to another parent.
    const [existing] = await transaction.select().from(documents).where(and(eq(documents.ownerUserId, ownerUserId),
      or(eq(documents.relativePath, relativePath), input.driveFileId ? eq(documents.driveFileId, input.driveFileId) : undefined))).limit(1);
    if (existing) {
      if (existing.driveFileId && input.driveFileId && existing.driveFileId !== input.driveFileId) return null;
      await transaction.update(documents).set({ ...input, relativePath, updatedAt: new Date() }).where(eq(documents.id, existing.id));
      await transaction.insert(documentLinks).values({ documentId: existing.id, targetType: target.type, targetId: target.id }).onConflictDoNothing();
      return { id: existing.id };
    }
    const [document] = await transaction.insert(documents).values({
      ownerUserId, displayName: input.displayName.trim(), relativePath,
      driveFileId: input.driveFileId ?? null, webUrl: input.webUrl ?? null,
      mimeType: input.mimeType ?? null, extension: input.extension ?? null,
      sizeBytes: input.sizeBytes ?? null, fileModifiedAt: input.fileModifiedAt ?? null,
    }).returning({ id: documents.id });
    await transaction.insert(documentLinks).values({ documentId: document.id, targetType: target.type, targetId: target.id });
    return document;
  });
}

/** Adds only an association. It never copies, moves, or otherwise changes a file. */
export async function linkDocumentToTarget(ownerUserId: string, documentId: string, target: DocumentTarget) {
  if (!await getDocument(ownerUserId, documentId) || !await targetExistsForOwner(ownerUserId, target)) return false;
  await createDatabaseClient().insert(documentLinks).values({ documentId, targetType: target.type, targetId: target.id }).onConflictDoNothing();
  return true;
}

/** Removing a link never deletes a Document record or its file. */
export async function unlinkDocumentFromTarget(ownerUserId: string, documentId: string, target: DocumentTarget) {
  if (!await getDocument(ownerUserId, documentId) || !await targetExistsForOwner(ownerUserId, target)) return false;
  await createDatabaseClient().delete(documentLinks).where(and(
    eq(documentLinks.documentId, documentId), eq(documentLinks.targetType, target.type), eq(documentLinks.targetId, target.id),
  ));
  return true;
}

/** Updates metadata only; a future desktop operation moves the real file first. */
export async function updateDocumentRelativePath(ownerUserId: string, documentId: string, relativePathInput: string) {
  const relativePath = normalizeDocumentRelativePath(relativePathInput);
  if (!relativePath || !await getDocument(ownerUserId, documentId)) return false;
  const updated = await createDatabaseClient().update(documents).set({ relativePath, updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.ownerUserId, ownerUserId))).returning({ id: documents.id });
  return updated.length === 1;
}
