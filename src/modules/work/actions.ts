"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDatabaseClient } from "@/db/client";
import { tasks, deadlines, importantDates } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getMatter } from "@/modules/matters/queries";
import { getMatterDeadline } from "./queries";
import { taskSchema, deadlineSchema, importantDateSchema, newTaskDeadlineSchema, workIdSchema, taskDoneSchema } from "./validation";

export type WorkFormState = { error?: string; success?: string; values?: Record<string, string> };

function formValues(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function refreshWork(matterId: string) {
  revalidatePath(`/matters/${matterId}`);
  revalidatePath("/");
}

function validIds(matterId: string, recordId: string | null) {
  return workIdSchema.safeParse(matterId).success && (recordId === null || workIdSchema.safeParse(recordId).success);
}

// A correction to title/description must retain the original instant, including
// the second occurrence of a repeated DST hour and sub-second precision.
function preserveUnchangedTime(column: typeof deadlines.deadlineAt | typeof importantDates.eventAt, value: Date) {
  const instant = value.toISOString();
  return sql`case when date_trunc('second', ${column} at time zone 'Asia/Jerusalem')
    = date_trunc('second', ${instant}::timestamptz at time zone 'Asia/Jerusalem')
    then ${column} else ${instant}::timestamptz end`;
}

function validationMessage(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => issue.path[0] === "deadlineAt" || issue.path[0] === "eventAt" || issue.path[0] === "deadlineDate" || issue.path[0] === "deadlineTime"
    ? "יש להזין תאריך ושעה תקינים לפי שעון ישראל."
    : issue.path[0] === "deadlineId" ? "יש לבחור דדליין מהתיק או להשאיר ללא דדליין." : issue.message).join(" ");
}

export async function saveTask(matterId: string, recordId: string | null, _: WorkFormState, formData: FormData): Promise<WorkFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!validIds(matterId, recordId)) return { error: "הרשומה או התיק אינם זמינים.", values };
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: validationMessage(parsed.error.issues), values };
  const createsDeadline = formData.get("createDeadline") === "true";
  const newDeadline = createsDeadline ? newTaskDeadlineSchema.safeParse({
    title: formData.get("newDeadlineTitle"),
    deadlineDate: formData.get("newDeadlineDate"),
    deadlineTime: formData.get("newDeadlineTime"),
  }) : null;
  if (newDeadline && !newDeadline.success) return { error: validationMessage(newDeadline.error.issues), values };
  try {
    if (!await getMatter(ownerUserId, matterId)) return { error: "התיק אינו זמין.", values };
    if (parsed.data.deadlineId && !await getMatterDeadline(ownerUserId, matterId, parsed.data.deadlineId)) return { error: "הדדליין אינו זמין בתיק זה.", values };
    const database = createDatabaseClient();
    let deadlineId = parsed.data.deadlineId;
    if (newDeadline?.success) {
      const [created] = await database.insert(deadlines).values({
        ...newDeadline.data, description: null, matterId, ownerUserId,
      }).returning({ id: deadlines.id });
      if (!created) return { error: "יצירת הדדליין נכשלה. נסו שוב.", values };
      deadlineId = created.id;
    }
    if (recordId) {
      const updated = await database.update(tasks).set({ ...parsed.data, deadlineId, updatedAt: new Date() })
        .where(and(eq(tasks.id, recordId), eq(tasks.matterId, matterId), eq(tasks.ownerUserId, ownerUserId)))
        .returning({ id: tasks.id });
      if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values };
    } else {
      await database.insert(tasks).values({ ...parsed.data, deadlineId, matterId, ownerUserId, done: false });
    }
  } catch {
    return { error: "השמירה נכשלה. נסו שוב.", values };
  }
  refreshWork(matterId);
  return { success: "המשימה נשמרה." };
}

export async function saveDeadline(matterId: string, recordId: string | null, _: WorkFormState, formData: FormData): Promise<WorkFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!validIds(matterId, recordId)) return { error: "הרשומה או התיק אינם זמינים.", values };
  const parsed = deadlineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: validationMessage(parsed.error.issues), values };
  let clientId: string;
  try {
    const parent = await getMatter(ownerUserId, matterId);
    if (!parent) return { error: "התיק אינו זמין.", values };
    clientId = parent.client.id;
    const database = createDatabaseClient();
    if (recordId) {
      const updated = await database.update(deadlines).set({ ...parsed.data, deadlineAt: preserveUnchangedTime(deadlines.deadlineAt, parsed.data.deadlineAt), updatedAt: new Date() })
        .where(and(eq(deadlines.id, recordId), eq(deadlines.matterId, matterId), eq(deadlines.ownerUserId, ownerUserId)))
        .returning({ id: deadlines.id });
      if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values };
    } else {
      await database.insert(deadlines).values({ ...parsed.data, matterId, ownerUserId });
    }
  } catch {
    return { error: "השמירה נכשלה. נסו שוב.", values };
  }
  refreshWork(matterId);
  revalidatePath(`/clients/${clientId}`);
  return { success: "הדדליין נשמר." };
}

export async function saveImportantDate(matterId: string, recordId: string | null, _: WorkFormState, formData: FormData): Promise<WorkFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!validIds(matterId, recordId)) return { error: "הרשומה או התיק אינם זמינים.", values };
  const parsed = importantDateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: validationMessage(parsed.error.issues), values };
  try {
    if (!await getMatter(ownerUserId, matterId)) return { error: "התיק אינו זמין.", values };
    const database = createDatabaseClient();
    if (recordId) {
      const updated = await database.update(importantDates).set({ ...parsed.data, eventAt: preserveUnchangedTime(importantDates.eventAt, parsed.data.eventAt), updatedAt: new Date() })
        .where(and(eq(importantDates.id, recordId), eq(importantDates.matterId, matterId), eq(importantDates.ownerUserId, ownerUserId)))
        .returning({ id: importantDates.id });
      if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values };
    } else {
      await database.insert(importantDates).values({ ...parsed.data, matterId, ownerUserId });
    }
  } catch {
    return { error: "השמירה נכשלה. נסו שוב.", values };
  }
  refreshWork(matterId);
  return { success: "התאריך החשוב נשמר." };
}

export async function setTaskDone(matterId: string, taskId: string, done: boolean): Promise<WorkFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  if (!validIds(matterId, taskId) || !workIdSchema.safeParse(taskId).success || !taskDoneSchema.safeParse(done).success) return { error: "המשימה אינה זמינה." };
  try {
    if (!await getMatter(ownerUserId, matterId)) return { error: "התיק אינו זמין." };
    const updated = await createDatabaseClient().update(tasks).set({ done, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.matterId, matterId), eq(tasks.ownerUserId, ownerUserId)))
      .returning({ id: tasks.id });
    if (!updated.length) return { error: "המשימה אינה זמינה." };
  } catch {
    return { error: "עדכון המשימה נכשל. נסו שוב." };
  }
  refreshWork(matterId);
  return { success: done ? "המשימה הושלמה." : "המשימה נפתחה מחדש." };
}
