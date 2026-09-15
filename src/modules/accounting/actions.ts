"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDatabaseClient } from "@/db/client";
import { accountingLiabilities, accountingObligations, accountingRecords, manualIncome, officeExpenses, taxPayments, trustTransactions } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { ownsClientMatter } from "@/modules/clients/queries";
import { recordIdSchema } from "@/modules/clients/validation";
import { addAmounts, isNegativeAmount, subtractAmounts } from "./decimal";
import { getClientTrustSummary } from "./queries";
import { accountingLiabilitySchema, accountingObligationSchema, expenseSchema, legacyAccountingRecordSchema, manualIncomeSchema, taxPaymentSchema, trustTransactionSchema } from "./validation";

export type AccountingFormState = { error?: string; success?: string; values?: Record<string, string> };
function values(formData: FormData) { return Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string")); }
function refresh() { revalidatePath("/accounting"); revalidatePath("/"); }
function errorState(message: unknown, input: Record<string, string>) { return { error: message instanceof Error ? message.message : typeof message === "string" ? message : "יש לבדוק את השדות.", values: input }; }

export async function addManualIncome(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = manualIncomeSchema.safeParse(input);
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(manualIncome).values({ ...parsed.data, ownerUserId }); } catch { return { error: "שמירת ההכנסה נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההכנסה נוספה." };
}
export async function updateManualIncome(recordId: string, _: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = manualIncomeSchema.safeParse(input);
  if (!recordIdSchema.safeParse(recordId).success) return { error: "מזהה רשומה שגוי.", values: input };
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try {
    const updated = await createDatabaseClient().update(manualIncome).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(manualIncome.id, recordId), eq(manualIncome.ownerUserId, ownerUserId))).returning({ id: manualIncome.id });
    if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values: input };
  } catch { return { error: "שמירת השינויים נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההכנסה עודכנה." };
}
export async function addExpense(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(officeExpenses).values({ ...parsed.data, ownerUserId }); } catch { return { error: "שמירת ההוצאה נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההוצאה נוספה." };
}
export async function updateExpense(recordId: string, _: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = expenseSchema.safeParse(input);
  if (!recordIdSchema.safeParse(recordId).success) return { error: "מזהה רשומה שגוי.", values: input };
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try {
    const updated = await createDatabaseClient().update(officeExpenses).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(officeExpenses.id, recordId), eq(officeExpenses.ownerUserId, ownerUserId))).returning({ id: officeExpenses.id });
    if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values: input };
  } catch { return { error: "שמירת השינויים נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההוצאה עודכנה." };
}
export async function addTrustTransaction(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = trustTransactionSchema.safeParse(input);
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  if (!await ownsClientMatter(ownerUserId, parsed.data.clientId, parsed.data.matterId)) return { error: "הלקוח או התיק אינם זמינים לנאמנות.", values: input };
  if (parsed.data.transactionType === "release") {
    const balance = await getClientTrustSummary(ownerUserId, parsed.data.clientId);
    if (isNegativeAmount(subtractAmounts(balance, parsed.data.amount))) return { error: "לא ניתן לשחרר סכום העולה על יתרת הנאמנות של הלקוח.", values: input };
  }
  try { await createDatabaseClient().insert(trustTransactions).values({ ...parsed.data, ownerUserId }); } catch { return { error: "שמירת פעולת הנאמנות נכשלה. נסו שוב.", values: input }; }
  refresh(); revalidatePath(`/clients/${parsed.data.clientId}`); return { success: "פעולת הנאמנות נוספה." };
}
export async function updateTrustTransaction(recordId: string, originalClientId: string, _: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = trustTransactionSchema.safeParse(input);
  if (!recordIdSchema.safeParse(recordId).success) return { error: "מזהה רשומה שגוי.", values: input };
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  if (!await ownsClientMatter(ownerUserId, parsed.data.clientId, parsed.data.matterId)) return { error: "הלקוח או התיק אינם זמינים.", values: input };
  try {
    const database = createDatabaseClient();
    const [existing] = await database.select({ clientId: trustTransactions.clientId, transactionType: trustTransactions.transactionType, amount: trustTransactions.amount })
      .from(trustTransactions).where(and(eq(trustTransactions.id, recordId), eq(trustTransactions.ownerUserId, ownerUserId))).limit(1);
    if (!existing) return { error: "פעולת הנאמנות אינה זמינה לעריכה.", values: input };
    if (parsed.data.transactionType === "release") {
      const balance = await getClientTrustSummary(ownerUserId, parsed.data.clientId);
      const balanceWithoutExisting = existing.clientId === parsed.data.clientId
        ? addAmounts(balance, existing.transactionType === "receipt" ? `-${existing.amount}` : existing.amount)
        : balance;
      if (isNegativeAmount(subtractAmounts(balanceWithoutExisting, parsed.data.amount))) return { error: "לא ניתן לשחרר סכום העולה על יתרת הנאמנות של הלקוח.", values: input };
    }
    const updated = await database.update(trustTransactions).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(trustTransactions.id, recordId), eq(trustTransactions.ownerUserId, ownerUserId))).returning({ id: trustTransactions.id });
    if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values: input };
  } catch { return { error: "שמירת השינויים נכשלה. נסו שוב.", values: input }; }
  refresh(); revalidatePath(`/clients/${parsed.data.clientId}`); if (originalClientId !== parsed.data.clientId) revalidatePath(`/clients/${originalClientId}`);
  return { success: "פעולת הנאמנות עודכנה." };
}
export async function addTaxPayment(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = taxPaymentSchema.safeParse(input);
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
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
  refresh(); return { success: parsed.data.paymentKind === "vat" ? `תשלום המע"מ נוסף.` : "תשלום המס נוסף." };
}
export async function updateTaxPayment(recordId: string, _: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = taxPaymentSchema.safeParse(input);
  if (!recordIdSchema.safeParse(recordId).success) return { error: "מזהה רשומה שגוי.", values: input };
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try {
    const updated = await createDatabaseClient().update(taxPayments).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(taxPayments.id, recordId), eq(taxPayments.ownerUserId, ownerUserId))).returning({ id: taxPayments.id });
    if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values: input };
  } catch { return { error: "שמירת השינויים נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "תשלום המס עודכן." };
}
export async function addAccountingLiability(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = accountingLiabilitySchema.safeParse(input);
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(accountingLiabilities).values({ ...parsed.data, ownerUserId, status: "open" }); } catch { return { error: "שמירת הסכום לתשלום נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "הסכום לתשלום נוסף." };
}
export async function updateAccountingLiability(recordId: string, _: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = accountingLiabilitySchema.safeParse(input);
  if (!recordIdSchema.safeParse(recordId).success) return { error: "מזהה רשומה שגוי.", values: input };
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try {
    const updated = await createDatabaseClient().update(accountingLiabilities).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(accountingLiabilities.id, recordId), eq(accountingLiabilities.ownerUserId, ownerUserId))).returning({ id: accountingLiabilities.id });
    if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values: input };
  } catch { return { error: "שמירת השינויים נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "הסכום לתשלום עודכן." };
}
export async function addAccountingObligation(_: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = accountingObligationSchema.safeParse(input);
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try { await createDatabaseClient().insert(accountingObligations).values({ ...parsed.data, ownerUserId, done: false }); } catch { return { error: "שמירת ההתחייבות נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההתחייבות נוספה." };
}
export async function updateAccountingObligation(recordId: string, _: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = accountingObligationSchema.safeParse(input);
  if (!recordIdSchema.safeParse(recordId).success) return { error: "מזהה רשומה שגוי.", values: input };
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try {
    const updated = await createDatabaseClient().update(accountingObligations).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(accountingObligations.id, recordId), eq(accountingObligations.ownerUserId, ownerUserId))).returning({ id: accountingObligations.id });
    if (!updated.length) return { error: "ההתחייבות אינה זמינה לעריכה.", values: input };
  } catch { return { error: "שמירת ההתחייבות נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "ההתחייבות עודכנה." };
}
export async function updateLegacyAccountingRecord(recordId: string, _: AccountingFormState, formData: FormData): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId(); const input = values(formData); const parsed = legacyAccountingRecordSchema.safeParse(input);
  if (!recordIdSchema.safeParse(recordId).success) return { error: "מזהה רשומה שגוי.", values: input };
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message, input);
  try {
    const updated = await createDatabaseClient().update(accountingRecords).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(accountingRecords.id, recordId), eq(accountingRecords.ownerUserId, ownerUserId))).returning({ id: accountingRecords.id });
    if (!updated.length) return { error: "הרשומה אינה זמינה לעריכה.", values: input };
  } catch { return { error: "שמירת השינויים נכשלה. נסו שוב.", values: input }; }
  refresh(); return { success: "הרשומה הקודמת עודכנה." };
}
export async function setAccountingObligationDone(obligationId: string, done: boolean): Promise<AccountingFormState> {
  const ownerUserId = await requireAuthenticatedUserId();
  if (!recordIdSchema.safeParse(obligationId).success || typeof done !== "boolean") return { error: "ההתחייבות אינה זמינה." };
  try { const updated = await createDatabaseClient().update(accountingObligations).set({ done, updatedAt: new Date() }).where(and(eq(accountingObligations.id, obligationId), eq(accountingObligations.ownerUserId, ownerUserId))).returning({ id: accountingObligations.id }); if (!updated.length) return { error: "ההתחייבות אינה זמינה." }; } catch { return { error: "עדכון ההתחייבות נכשל. נסו שוב." }; }
  refresh(); return { success: "ההתחייבות עודכנה." };
}
