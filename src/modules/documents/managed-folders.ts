import "server-only";
import { and, eq } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { clients, matters, financialRecords, clientObligations, trustTransactions, tasks, deadlines, importantDates, matterHistory, matterNotes } from "@/db/schema";
import { DocumentError } from "./google-drive";
import { folderSegment, type DocumentTarget } from "./validation";
import { targetExistsForOwner } from "./service";

export async function managedFolderSegments(owner: string, target: DocumentTarget) {
  if (!await targetExistsForOwner(owner, target)) throw new DocumentError("הרשומה לא נמצאה או שאין הרשאה אליה.");
  const db = createDatabaseClient();
  let clientId: string | null = target.type === "client" ? target.id : null;
  let matterId: string | null = target.type === "matter" ? target.id : null;
  if (["financial_record", "client_obligation", "trust_transaction"].includes(target.type)) {
    const table = target.type === "financial_record" ? financialRecords : target.type === "client_obligation" ? clientObligations : trustTransactions;
    const [row] = await db.select({ clientId: table.clientId, matterId: table.matterId }).from(table).where(and(eq(table.id, target.id), eq(table.ownerUserId, owner))).limit(1);
    clientId = row.clientId; matterId = row.matterId;
  }
  if (["task", "deadline", "important_date", "matter_history", "matter_note"].includes(target.type)) {
    const table = target.type === "task" ? tasks : target.type === "deadline" ? deadlines : target.type === "important_date" ? importantDates : target.type === "matter_history" ? matterHistory : matterNotes;
    const [row] = await db.select({ matterId: table.matterId }).from(table).where(and(eq(table.id, target.id), eq(table.ownerUserId, owner))).limit(1);
    matterId = row.matterId;
  }
  let matter: { title: string; id: string; clientId: string } | undefined;
  if (matterId) {
    [matter] = await db.select({ title: matters.title, id: matters.id, clientId: matters.clientId }).from(matters).where(and(eq(matters.id, matterId), eq(matters.ownerUserId, owner))).limit(1);
    if (!matter) throw new DocumentError("התיק לא נמצא.");
    clientId = matter.clientId;
  }
  const segments = ["CRM"];
  if (clientId) {
    const [client] = await db.select({ name: clients.name, id: clients.id }).from(clients).where(and(eq(clients.id, clientId), eq(clients.ownerUserId, owner))).limit(1);
    if (!client) throw new DocumentError("הלקוח לא נמצא.");
    segments.push(folderSegment(client.name, client.id));
    if (matter) segments.push(folderSegment(matter.title, matter.id));
  } else segments.push("הנהלת חשבונות", `${target.type}-${target.id}`);
  return segments;
}
