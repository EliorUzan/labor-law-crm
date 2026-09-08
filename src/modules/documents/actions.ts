"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDatabaseClient } from "@/db/client";
import { documentReferences } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { recordIdSchema } from "@/modules/clients/validation";
import { getMatter } from "@/modules/matters/queries";
import { documentReferenceSchema } from "./validation";

export type DocumentFormState = { error?: string; success?: string; values?: Record<string, string> };

function formValues(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export async function saveDocumentReference(
  matterId: string,
  documentId: string | null,
  _: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  const values = formValues(formData);
  if (!recordIdSchema.safeParse(matterId).success || (documentId !== null && !recordIdSchema.safeParse(documentId).success)) {
    return { error: "המסמך או התיק אינם זמינים.", values };
  }
  const parsed = documentReferenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((issue) => issue.message).join(" "), values };

  try {
    if (!await getMatter(ownerUserId, matterId)) return { error: "התיק אינו זמין.", values };
    const database = createDatabaseClient();
    if (documentId) {
      const updated = await database.update(documentReferences).set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(documentReferences.id, documentId), eq(documentReferences.matterId, matterId), eq(documentReferences.ownerUserId, ownerUserId)))
        .returning({ id: documentReferences.id });
      if (!updated.length) return { error: "המסמך אינו זמין לעריכה.", values };
    } else {
      await database.insert(documentReferences).values({ ...parsed.data, matterId, ownerUserId });
    }
  } catch {
    return { error: "שמירת המסמך נכשלה. נסו שוב.", values };
  }

  revalidatePath(`/matters/${matterId}`);
  return { success: documentId ? "המסמך עודכן." : "המסמך נוסף." };
}
