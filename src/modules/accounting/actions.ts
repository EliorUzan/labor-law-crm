"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDatabaseClient } from "@/db/client";
import { accountingLiabilities, accountingObligations, manualIncome, officeExpenses, taxPayments, trustTransactions } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { ownsClientMatter } from "@/modules/clients/queries";
import { recordIdSchema } from "@/modules/clients/validation";
import { isNegativeAmount, subtractAmounts } from "./decimal";
import { getClientTrustSummary } from "./queries";
import { accountingLiabilitySchema, accountingObligationSchema, expenseSchema, manualIncomeSchema, taxPaymentSchema, trustTransactionSchema } from "./validation";

export type AccountingFormState = { error?: string; success?: string; values?: Record<string, string> };
function values(formData: FormData) { return Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string")); }
function refresh() { revalidatePath("/accounting"); revalidatePath("/"); }
function error(error: unknown, values: Record<string, string>) { return { error: error instanceof Error ? error.message : "יש לבדוק את השדות.", values }; }

export async function addManualIncome(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = manualIncomeSchema.safeParse(input);
  if (!parsed.success) return error(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(manualIncome).values({ ...parsed.data, ownerUserId }); } catch { return { error: "שמירת ההכנסה נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההכנסה נוספה." };
}
export async function addExpense(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return error(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(officeExpenses).values({ ...parsed.data, ownerUserId }); } catch { return { error: "שמירת ההוצאה נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההוצאה נוספה." };
}
export async function addTrustTransaction(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = trustTransactionSchema.safeParse(input);
  if (!parsed.success) return error(parsed.error.issues[0]?.message, input);
  if (!await ownsClientMatter(ownerUserId, parsed.data.clientId, parsed.data.matterId)) return { error: "הלקוח או התיק אינם זמינים לנאמנות.", values: input };
  if (parsed.data.transactionType === "release") {
    const balance = await getClientTrustSummary(ownerUserId, parsed.data.clientId);
    if (isNegativeAmount(subtractAmounts(balance, parsed.data.amount))) return { error: "לא ניתן לשחרר סכום העולה על יתרת הנאמנות של הלקוח.", values: input };
  }
  try { await createDatabaseClient().insert(trustTransactions).values({ ...parsed.data, ownerUserId }); } catch { return { error: "שמירת פעולת הנאמנות נכשלה. נסו שוב.", values: input }; }
  refresh(); revalidatePath(`/clients/${parsed.data.clientId}`); return { success: "פעולת הנאמנות נוספה." };
}
export async function addTaxPayment(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = taxPaymentSchema.safeParse(input);
  if (!parsed.success) return error(parsed.error.issues[0]?.message, input);
  try {
    const database = createDatabaseClient();
    if (parsed.data.liabilityId) {
      const [liability] = await database.select({ id: accountingLiabilities.id, amount: accountingLiabilities.amount, liabilityType: accountingLiabilities.liabilityType, status: accountingLiabilities.status }).from(accountingLiabilities).where(and(eq(accountingLiabilities.id, parsed.data.liabilityId), eq(accountingLiabilities.ownerUserId, ownerUserId))).limit(1);
      if (!liability || liability.status !== "open" || liability.liabilityType !== parsed.data.paymentKind || liability.amount !== parsed.data.amount) return { error: "הסכום לתשלום אינו זמין לתשלום זה.", values: input };
      await database.transaction(async (transaction) => {
        const closed = await transaction.update(accountingLiabilities).set({ status: "paid", updatedAt: new Date() }).where(and(eq(accountingLiabilities.id, liability.id), eq(accountingLiabilities.ownerUserId, ownerUserId), eq(accountingLiabilities.status, "open"))).returning({ id: accountingLiabilities.id });
        if (!closed.length) throw new Error("liability-not-open");
        await transaction.insert(taxPayments).values({ ...parsed.data, ownerUserId });
      });
    } else {
      await database.insert(taxPayments).values({ ...parsed.data, ownerUserId });
    }
  } catch { return { error: "שמירת תשלום המס נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: parsed.data.paymentKind === "vat" ? "תשלום המע״מ נוסף." : "תשלום המס נוסף." };
}
export async function addAccountingLiability(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = accountingLiabilitySchema.safeParse(input);
  if (!parsed.success) return error(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(accountingLiabilities).values({ ...parsed.data, ownerUserId, status: "open" }); } catch { return { error: "שמירת הסכום לתשלום נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "הסכום לתשלום נוסף." };
}
export async function addAccountingObligation(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = accountingObligationSchema.safeParse(input);
  if (!parsed.success) return error(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(accountingObligations).values({ ...parsed.data, ownerUserId, done: false }); } catch { return { error: "שמירת ההתחייבות נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההתחייבות נוספה." };
}
export async function setAccountingObligationDone(obligationId: string, done: boolean): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  if (!recordIdSchema.safeParse(obligationId).success || typeof done !== "boolean") return { error: "ההתחייבות אינה זמינה." };
  try { const updated = await createDatabaseClient().update(accountingObligations).set({ done, updatedAt: new Date() }).where(and(eq(accountingObligations.id, obligationId), eq(accountingObligations.ownerUserId, ownerUserId))).returning({ id: accountingObligations.id }); if (!updated.length) return { error: "ההתחייבות אינה זמינה." }; } catch { return { error: "עדכון ההתחייבות נכשל. נסו שוב." }; }
  refresh(); return { success: "ההתחייבות עודכנה." };
}
