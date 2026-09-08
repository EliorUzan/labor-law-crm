"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDatabaseClient } from "@/db/client";
import { clients, clientObligations, financialRecords } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { ownsClientMatter } from "./queries";
import { clientSchema, financialRecordSchema, obligationSchema, obligationCompletionSchema, recordIdSchema } from "./validation";

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
  if (!parsed.success) return { error: "יש להזין כותרת להתחייבות ותאריך תקין אם מולא.", values };
  try {
    if (!await ownsClientMatter(ownerUserId, clientId, parsed.data.matterId)) return { error: "הלקוח או התיק שנבחרו אינם זמינים.", values };
    await createDatabaseClient().insert(clientObligations).values({ ...parsed.data, ownerUserId, done: false });
  } catch {
    return { error: "שמירת ההתחייבות נכשלה. נסו שוב.", values };
  }
  refreshClient(clientId);
  return { success: "ההתחייבות נשמרה." };
}

export async function setObligationCompletion(clientId: string, obligationId: string, _: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const parsed = obligationCompletionSchema.safeParse({ clientId, obligationId, done: formData.get("done") });
  if (!parsed.success) return { error: "לא ניתן לעדכן את ההתחייבות." };
  try {
    const updated = await createDatabaseClient().update(clientObligations).set({ done: parsed.data.done, updatedAt: new Date() })
      .where(and(eq(clientObligations.ownerUserId, ownerUserId), eq(clientObligations.clientId, clientId), eq(clientObligations.id, obligationId)))
      .returning({ id: clientObligations.id });
    if (!updated.length) return { error: "ההתחייבות אינה זמינה לעדכון." };
  } catch {
    return { error: "עדכון ההתחייבות נכשל. נסו שוב." };
  }
  refreshClient(clientId);
  return { success: "ההתחייבות עודכנה." };
}
