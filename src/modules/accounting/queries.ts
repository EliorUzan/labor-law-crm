import "server-only";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { accountingLiabilities, accountingObligations, accountingRecords, clients, financialRecords, manualIncome, matters, officeExpenses, taxPayments, trustTransactions } from "@/db/schema";
import { getFinancialSummary } from "@/modules/clients/financial-summary";
import { positiveAmount } from "./decimal";
import { calculateAccountingSummary } from "./summary";

export type AccountingMonth = { key: string; start: string; nextStart: string; label: string };
export function accountingMonth(value: string | undefined, now = new Date()): AccountingMonth {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit" }).formatToParts(now);
  const fallback = `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
  const key = /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") ? value! : fallback;
  const [year, month] = key.split("-").map(Number); const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return { key, start: `${key}-01`, nextStart: `${next}-01`, label: new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date(`${key}-01T12:00:00Z`)) };
}

/** Owned cash/control read model. Client payments are read directly, never copied. */
export async function getAccountingOverview(ownerUserId: string, month: AccountingMonth) {
  const database = createDatabaseClient();
  const [financialSummary, clientPayments, incomeRows, expenses, taxRows, trustRows, liabilities, obligations, legacyRecords, receivableRows, trustTotal] = await Promise.all([
    getFinancialSummary(ownerUserId, undefined, new Date(`${month.key}-15T12:00:00Z`)),
    database.select({ id: financialRecords.id, clientId: clients.id, clientName: clients.name, matterTitle: matters.title, recordDate: financialRecords.recordDate, amount: financialRecords.amount, description: financialRecords.description }).from(financialRecords).innerJoin(clients, and(eq(clients.id, financialRecords.clientId), eq(clients.ownerUserId, ownerUserId))).leftJoin(matters, and(eq(matters.id, financialRecords.matterId), eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, financialRecords.clientId))).where(and(eq(financialRecords.ownerUserId, ownerUserId), eq(financialRecords.type, "payment"), gte(financialRecords.recordDate, month.start), lt(financialRecords.recordDate, month.nextStart))).orderBy(asc(financialRecords.recordDate), asc(financialRecords.id)),
    database.select().from(manualIncome).where(and(eq(manualIncome.ownerUserId, ownerUserId), gte(manualIncome.recordDate, month.start), lt(manualIncome.recordDate, month.nextStart))).orderBy(asc(manualIncome.recordDate), asc(manualIncome.id)),
    database.select().from(officeExpenses).where(and(eq(officeExpenses.ownerUserId, ownerUserId), gte(officeExpenses.recordDate, month.start), lt(officeExpenses.recordDate, month.nextStart))).orderBy(asc(officeExpenses.recordDate), asc(officeExpenses.id)),
    database.select().from(taxPayments).where(and(eq(taxPayments.ownerUserId, ownerUserId), gte(taxPayments.recordDate, month.start), lt(taxPayments.recordDate, month.nextStart))).orderBy(asc(taxPayments.recordDate), asc(taxPayments.id)),
    database.select({ id: trustTransactions.id, clientId: clients.id, clientName: clients.name, matterTitle: matters.title, transactionType: trustTransactions.transactionType, recordDate: trustTransactions.recordDate, amount: trustTransactions.amount, description: trustTransactions.description }).from(trustTransactions).innerJoin(clients, and(eq(clients.id, trustTransactions.clientId), eq(clients.ownerUserId, ownerUserId))).leftJoin(matters, and(eq(matters.id, trustTransactions.matterId), eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, trustTransactions.clientId))).where(and(eq(trustTransactions.ownerUserId, ownerUserId), gte(trustTransactions.recordDate, month.start), lt(trustTransactions.recordDate, month.nextStart))).orderBy(asc(trustTransactions.recordDate), asc(trustTransactions.id)),
    database.select().from(accountingLiabilities).where(eq(accountingLiabilities.ownerUserId, ownerUserId)).orderBy(asc(accountingLiabilities.status), asc(accountingLiabilities.dueDate), desc(accountingLiabilities.createdAt)),
    database.select().from(accountingObligations).where(eq(accountingObligations.ownerUserId, ownerUserId)).orderBy(asc(accountingObligations.done), asc(accountingObligations.dueDate), desc(accountingObligations.createdAt)),
    database.select().from(accountingRecords).where(and(eq(accountingRecords.ownerUserId, ownerUserId), gte(accountingRecords.recordDate, month.start), lt(accountingRecords.recordDate, month.nextStart))).orderBy(desc(accountingRecords.recordDate), desc(accountingRecords.createdAt)),
    database.select({ clientId: clients.id, clientName: clients.name, balance: sql<string>`coalesce(sum(case when ${financialRecords.type} in ('fee', 'charge') then ${financialRecords.amount} else -${financialRecords.amount} end), 0)` }).from(clients).leftJoin(financialRecords, and(eq(financialRecords.clientId, clients.id), eq(financialRecords.ownerUserId, ownerUserId))).where(eq(clients.ownerUserId, ownerUserId)).groupBy(clients.id, clients.name).orderBy(asc(clients.name)),
    database.select({ balance: sql<string>`coalesce(sum(case when ${trustTransactions.transactionType} = 'receipt' then ${trustTransactions.amount} else -${trustTransactions.amount} end), 0)` }).from(trustTransactions).where(eq(trustTransactions.ownerUserId, ownerUserId)),
  ]);
  const clientIncome = financialSummary.paymentsReceivedThisMonth;
  const receivables = receivableRows.flatMap((row) => { const balance = positiveAmount(row.balance); return balance ? [{ ...row, balance }] : []; });
  const summary = calculateAccountingSummary({ clientIncome, manualIncome: incomeRows, expenses, taxPayments: taxRows, liabilities, clientBalances: receivableRows.map((row) => row.balance), trustTransactions: trustRows });
  const outgoingPayments = [...expenses.map((row) => ({ id: `expense-${row.id}`, recordDate: row.recordDate, description: row.description, amount: row.amount, kind: "הוצאה" })), ...taxRows.map((row) => ({ id: `tax-${row.id}`, recordDate: row.recordDate, description: row.description ?? row.taxType ?? (row.paymentKind === "vat" ? "מע״מ" : "מס"), amount: row.amount, kind: row.paymentKind === "vat" ? "מע״מ" : "מס" })), ...trustRows.filter((row) => row.transactionType === "release").map((row) => ({ id: `trust-${row.id}`, recordDate: row.recordDate, description: row.description ?? `שחרור נאמנות — ${row.clientName}`, amount: row.amount, kind: "נאמנות" }))].sort((first, second) => first.recordDate.localeCompare(second.recordDate));
  return { month, clientPayments, incomeRows, expenses, taxRows, trustRows, liabilities, obligations, legacyRecords, receivables, outgoingPayments, summary: { ...summary, trustBalance: trustTotal[0]?.balance ?? summary.trustBalance } };
}

export async function getAccountingFormOptions(ownerUserId: string) {
  const database = createDatabaseClient();
  const [clientRows, matterRows, openLiabilities] = await Promise.all([
    database.select({ id: clients.id, name: clients.name }).from(clients).where(eq(clients.ownerUserId, ownerUserId)).orderBy(asc(clients.name)),
    database.select({ id: matters.id, clientId: matters.clientId, title: matters.title }).from(matters).where(eq(matters.ownerUserId, ownerUserId)).orderBy(asc(matters.title)),
    database.select({ id: accountingLiabilities.id, liabilityType: accountingLiabilities.liabilityType, amount: accountingLiabilities.amount, period: accountingLiabilities.period }).from(accountingLiabilities).where(and(eq(accountingLiabilities.ownerUserId, ownerUserId), eq(accountingLiabilities.status, "open"))).orderBy(asc(accountingLiabilities.dueDate)),
  ]); return { clients: clientRows, matters: matterRows, openLiabilities };
}
export async function getClientTrustSummary(ownerUserId: string, clientId: string) {
  const [summary] = await createDatabaseClient().select({ balance: sql<string>`coalesce(sum(case when ${trustTransactions.transactionType} = 'receipt' then ${trustTransactions.amount} else -${trustTransactions.amount} end), 0)` }).from(trustTransactions).where(and(eq(trustTransactions.ownerUserId, ownerUserId), eq(trustTransactions.clientId, clientId)));
  return summary?.balance ?? "0";
}
