"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDatabaseClient } from "@/db/client";
import { matters, matterHistory, matterNotes } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getClient } from "@/modules/clients/queries";
import { recordIdSchema } from "@/modules/clients/validation";
import { getMatter } from "./queries";
import { matterSchema, historySchema, matterNoteSchema } from "./validation";

export type MatterFormState = { error?: string; success?: string; values?: Record<string, string> };

function formValues(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function refreshMatter(clientId: string, matterId: string) {
  revalidatePath(`/matters/${matterId}`);
  revalidatePath(`/matters/${matterId}/edit`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

function validationMessage(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => issue.path[0] === "openDate" || issue.path[0] === "eventDate" ? "יש להזין תאריך תקין." : issue.message).join(" ");
}

export async function createMatter(clientId: string, _: MatterFormState, formData: FormData): Promise<MatterFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!recordIdSchema.safeParse(clientId).success) return { error: "הלקוח אינו זמין.", values };
  const parsed = matterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: validationMessage(parsed.error.issues), values };
  let matterId: string;
  try {
    if (!await getClient(ownerUserId, clientId)) return { error: "הלקוח אינו זמין.", values };
    const [matter] = await createDatabaseClient().insert(matters).values({ ...parsed.data, ownerUserId, clientId }).returning({ id: matters.id });
    matterId = matter.id;
  } catch {
    return { error: "שמירת התיק נכשלה. נסו שוב.", values };
  }
  refreshMatter(clientId, matterId);
  redirect(`/matters/${matterId}`);
}

export async function updateMatter(matterId: string, _: MatterFormState, formData: FormData): Promise<MatterFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!recordIdSchema.safeParse(matterId).success) return { error: "התיק אינו זמין לעריכה.", values };
  const parsed = matterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: validationMessage(parsed.error.issues), values };
  let clientId: string;
  try {
    const existing = await getMatter(ownerUserId, matterId);
    if (!existing) return { error: "התיק אינו זמין לעריכה.", values };
    clientId = existing.client.id;
    const updated = await createDatabaseClient().update(matters).set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(matters.id, matterId), eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, clientId))).returning({ id: matters.id });
    if (!updated.length) return { error: "התיק אינו זמין לעריכה.", values };
  } catch {
    return { error: "שמירת השינויים נכשלה. נסו שוב.", values };
  }
  refreshMatter(clientId, matterId);
  redirect(`/matters/${matterId}`);
}

export async function saveHistoryEntry(matterId: string, entryId: string | null, _: MatterFormState, formData: FormData): Promise<MatterFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!recordIdSchema.safeParse(matterId).success || (entryId !== null && !recordIdSchema.safeParse(entryId).success)) return { error: "האירוע או התיק אינם זמינים.", values };
  const parsed = historySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: validationMessage(parsed.error.issues), values };
  let clientId: string;
  try {
    const existing = await getMatter(ownerUserId, matterId);
    if (!existing) return { error: "התיק אינו זמין.", values };
    clientId = existing.client.id;
    const database = createDatabaseClient();
    if (entryId) {
      const updated = await database.update(matterHistory).set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(matterHistory.id, entryId), eq(matterHistory.matterId, matterId), eq(matterHistory.ownerUserId, ownerUserId)))
        .returning({ id: matterHistory.id });
      if (!updated.length) return { error: "האירוע אינו זמין לעריכה.", values };
    } else {
      await database.insert(matterHistory).values({ ...parsed.data, matterId, ownerUserId });
    }
  } catch {
    return { error: "שמירת האירוע נכשלה. נסו שוב.", values };
  }
  refreshMatter(clientId, matterId);
  return { success: entryId ? "האירוע עודכן." : "האירוע נוסף להיסטוריה." };
}

export async function saveMatterNote(matterId: string, noteId: string | null, _: MatterFormState, formData: FormData): Promise<MatterFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!recordIdSchema.safeParse(matterId).success || (noteId !== null && !recordIdSchema.safeParse(noteId).success)) return { error: "ההערה או התיק אינם זמינים.", values };
  const parsed = matterNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: validationMessage(parsed.error.issues), values };
  let clientId: string;
  try {
    const existing = await getMatter(ownerUserId, matterId);
    if (!existing) return { error: "התיק אינו זמין.", values };
    clientId = existing.client.id;
    const database = createDatabaseClient();
    if (noteId) {
      const updated = await database.update(matterNotes).set({ content: parsed.data.content, updatedAt: new Date() })
        .where(and(eq(matterNotes.id, noteId), eq(matterNotes.matterId, matterId), eq(matterNotes.ownerUserId, ownerUserId)))
        .returning({ id: matterNotes.id });
      if (!updated.length) return { error: "ההערה אינה זמינה לעריכה.", values };
    } else {
      await database.insert(matterNotes).values({ ...parsed.data, matterId, ownerUserId });
    }
  } catch {
    return { error: "שמירת ההערה נכשלה. נסו שוב.", values };
  }
  refreshMatter(clientId, matterId);
  return { success: noteId ? "ההערה עודכנה." : "ההערה נוספה." };
}
