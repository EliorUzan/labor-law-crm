"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDatabaseClient } from "@/db/client";
import { clients, clientObligations, deadlines, financialRecords } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getClientDeadline, ownsClientMatter } from "./queries";
import { clientSchema, financialRecordSchema, obligationSchema, obligationCompletionSchema, recordIdSchema } from "./validation";
import { deadlineSchema } from "@/modules/work/validation";

export type ClientFormState = { error?: string; success?: string; values?: Record<string, string> };

function formValues(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function refreshClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function createClient(_: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "יש להזין שם לקוח, דוא״ל תקין אם מולא, ושדות באורך סביר.", values };
  let clientId: string;
  try {
    const [client] = await createDatabaseClient().insert(clients).values({ ...parsed.data, ownerUserId }).returning({ id: clients.id });
    clientId = client.id;
  } catch {
    return { error: "שמירת הלקוח נכשלה. נסו שוב.", values };
  }
  refreshClient(clientId);
  redirect(`/clients/${clientId}`);
}

export async function updateClient(clientId: string, _: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!recordIdSchema.safeParse(clientId).success || !parsed.success) return { error: "יש לבדוק את שם הלקוח, הדוא״ל ושאר השדות.", values };
  try {
    const updated = await createDatabaseClient().update(clients).set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.ownerUserId, ownerUserId))).returning({ id: clients.id });
    if (!updated.length) return { error: "הלקוח אינו זמין לעריכה.", values };
  } catch {
    return { error: "שמירת השינויים נכשלה. נסו שוב.", values };
  }
  refreshClient(clientId);
  redirect(`/clients/${clientId}`);
}

export async function addFinancialRecord(clientId: string, _: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  const parsed = financialRecordSchema.safeParse({ ...Object.fromEntries(formData), clientId });
  if (!parsed.success) return { error: "יש להזין סוג רשומה, סכום חיובי (עד 12 ספרות ושתי ספרות אחרי הנקודה) ותאריך תקין.", values };
  try {
    if (!await ownsClientMatter(ownerUserId, clientId, parsed.data.matterId)) return { error: "הלקוח או התיק שנבחרו אינם זמינים.", values };
    await createDatabaseClient().insert(financialRecords).values({ ...parsed.data, ownerUserId });
  } catch {
    return { error: "שמירת הרשומה הכספית נכשלה. נסו שוב.", values };
  }
  refreshClient(clientId);
  return { success: "הרשומה הכספית נשמרה." };
}

export async function addObligation(clientId: string, _: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  const parsed = obligationSchema.safeParse({ ...Object.fromEntries(formData), clientId });
  if (!parsed.success) return { error: "יש להזין כותרת ותאריך תקין אם מולא.", values };
  const createsDeadline = formData.get("createDeadline") === "true";
  const newDeadline = createsDeadline ? deadlineSchema.safeParse({
    title: formData.get("newDeadlineTitle"), deadlineDate: formData.get("newDeadlineDate"), deadlineTime: formData.get("newDeadlineTime"),
  }) : null;
  const newDeadlineMatterId = formData.get("newDeadlineMatterId");
  if (newDeadline && (!newDeadline.success || !recordIdSchema.safeParse(newDeadlineMatterId).success)) return { error: "יש לבחור תיק, כותרת ותאריך תקינים לדדליין החדש.", values };
  let deadlineMatterId: string | null = null;
  try {
    if (!await ownsClientMatter(ownerUserId, clientId, parsed.data.matterId)) return { error: "הלקוח או התיק שנבחרו אינם זמינים.", values };
    if (newDeadline?.success) {
      if (!await ownsClientMatter(ownerUserId, clientId, newDeadlineMatterId as string)) return { error: "התיק שנבחר לדדליין אינו זמין.", values };
      const database = createDatabaseClient();
      const [created] = await database.insert(deadlines).values({ ...newDeadline.data, matterId: newDeadlineMatterId as string, ownerUserId }).returning({ id: deadlines.id });
      if (!created) return { error: "יצירת הדדליין נכשלה. נסו שוב.", values };
      deadlineMatterId = newDeadlineMatterId as string;
      await database.insert(clientObligations).values({ ...parsed.data, deadlineId: created.id, dueDate: null, ownerUserId, done: false });
    } else if (parsed.data.deadlineId) {
      const deadline = await getClientDeadline(ownerUserId, clientId, parsed.data.deadlineId, parsed.data.matterId);
      if (!deadline) return { error: "הדדליין אינו זמין עבור לקוח זה.", values };
      deadlineMatterId = deadline.matterId;
      await createDatabaseClient().insert(clientObligations).values({ ...parsed.data, ownerUserId, done: false });
    } else {
      await createDatabaseClient().insert(clientObligations).values({ ...parsed.data, ownerUserId, done: false });
    }
  } catch {
    return { error: "שמירת ההתחייבות נכשלה. נסו שוב.", values };
  }
  refreshClient(clientId);
  for (const matterId of new Set([parsed.data.matterId, deadlineMatterId])) if (matterId) revalidatePath(`/matters/${matterId}`);
  return { success: "ההתחייבות נשמרה." };
}

export async function updateObligation(clientId: string, obligationId: string, _: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  const parsed = obligationSchema.safeParse({ ...Object.fromEntries(formData), clientId });
  if (!recordIdSchema.safeParse(obligationId).success || !parsed.success) return { error: "יש לבדוק את הכותרת, התאריך והשיוך לתיק ולדדליין.", values };
  const createsDeadline = formData.get("createDeadline") === "true";
  const newDeadline = createsDeadline ? deadlineSchema.safeParse({
    title: formData.get("newDeadlineTitle"), deadlineDate: formData.get("newDeadlineDate"), deadlineTime: formData.get("newDeadlineTime"),
  }) : null;
  const newDeadlineMatterId = formData.get("newDeadlineMatterId");
  if (newDeadline && (!newDeadline.success || !recordIdSchema.safeParse(newDeadlineMatterId).success)) return { error: "יש לבחור תיק, כותרת ותאריך תקינים לדדליין החדש.", values };
  let oldMatterId: string | null;
  let oldDeadlineId: string | null;
  let deadlineMatterId: string | null = null;
  try {
    if (!await ownsClientMatter(ownerUserId, clientId, parsed.data.matterId)) return { error: "הלקוח או התיק שנבחרו אינם זמינים.", values };
    let deadlineId = parsed.data.deadlineId;
    if (newDeadline?.success) {
      if (!await ownsClientMatter(ownerUserId, clientId, newDeadlineMatterId as string)) return { error: "התיק שנבחר לדדליין אינו זמין.", values };
      const [created] = await createDatabaseClient().insert(deadlines).values({ ...newDeadline.data, matterId: newDeadlineMatterId as string, ownerUserId }).returning({ id: deadlines.id });
      if (!created) return { error: "יצירת הדדליין נכשלה. נסו שוב.", values };
      deadlineId = created.id;
      deadlineMatterId = newDeadlineMatterId as string;
    } else if (parsed.data.deadlineId) {
      const deadline = await getClientDeadline(ownerUserId, clientId, parsed.data.deadlineId, parsed.data.matterId);
      if (!deadline) return { error: "הדדליין אינו זמין עבור לקוח זה.", values };
      deadlineMatterId = deadline.matterId;
    }
    const database = createDatabaseClient();
    const scope = and(eq(clientObligations.id, obligationId), eq(clientObligations.clientId, clientId), eq(clientObligations.ownerUserId, ownerUserId));
    const [existing] = await database.select({ matterId: clientObligations.matterId, deadlineId: clientObligations.deadlineId }).from(clientObligations).where(scope).limit(1);
    if (!existing) return { error: "ההתחייבות אינה זמינה לעריכה.", values };
    oldMatterId = existing.matterId;
    oldDeadlineId = existing.deadlineId;
    const { title, description, matterId, dueDate } = parsed.data;
    const updated = await database.update(clientObligations).set({ title, description, matterId, deadlineId, dueDate: deadlineId ? null : dueDate, updatedAt: new Date() })
      .where(scope).returning({ id: clientObligations.id });
    if (!updated.length) return { error: "ההתחייבות אינה זמינה לעריכה.", values };
  } catch {
    return { error: "שמירת ההתחייבות נכשלה. נסו שוב.", values };
  }
  refreshClient(clientId);
  const oldDeadlineMatterId = oldDeadlineId ? (await getClientDeadline(ownerUserId, clientId, oldDeadlineId))?.matterId ?? null : null;
  for (const matterId of new Set([oldMatterId, oldDeadlineMatterId, parsed.data.matterId, deadlineMatterId])) if (matterId) revalidatePath(`/matters/${matterId}`);
  return { success: "ההתחייבות עודכנה." };
}

export async function setObligationCompletion(clientId: string, obligationId: string, _: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const parsed = obligationCompletionSchema.safeParse({ clientId, obligationId, done: formData.get("done") });
  if (!parsed.success) return { error: "לא ניתן לעדכן את ההתחייבות." };
  let matterId: string | null;
  let deadlineId: string | null;
  try {
    if (!await ownsClientMatter(ownerUserId, clientId, null)) return { error: "הלקוח אינו זמין." };
    const updated = await createDatabaseClient().update(clientObligations).set({ done: parsed.data.done, updatedAt: new Date() })
      .where(and(eq(clientObligations.ownerUserId, ownerUserId), eq(clientObligations.clientId, clientId), eq(clientObligations.id, obligationId)))
      .returning({ id: clientObligations.id, matterId: clientObligations.matterId, deadlineId: clientObligations.deadlineId });
    if (!updated.length) return { error: "ההתחייבות אינה זמינה לעדכון." };
    matterId = updated[0].matterId;
    deadlineId = updated[0].deadlineId;
  } catch {
    return { error: "עדכון ההתחייבות נכשל. נסו שוב." };
  }
  refreshClient(clientId);
  const deadlineMatterId = deadlineId ? (await getClientDeadline(ownerUserId, clientId, deadlineId))?.matterId ?? null : null;
  for (const id of new Set([matterId, deadlineMatterId])) if (id) revalidatePath(`/matters/${id}`);
  return { success: "ההתחייבות עודכנה." };
}
