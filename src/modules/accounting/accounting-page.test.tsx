import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AccountingPageContent } from "./accounting-page";

const actions = vi.hoisted(() => ({ save: vi.fn(), toggle: vi.fn() }));
vi.mock("./actions", () => ({
  addAccountingLiability: actions.save, addAccountingObligation: actions.save, addExpense: actions.save, addManualIncome: actions.save,
  addTaxPayment: actions.save, addTrustTransaction: actions.save, setAccountingObligationDone: actions.toggle,
  updateAccountingLiability: actions.save, updateAccountingObligation: actions.save, updateExpense: actions.save,
  updateLegacyAccountingRecord: actions.save, updateManualIncome: actions.save, updateTaxPayment: actions.save, updateTrustTransaction: actions.save,
}));

type Props = ComponentProps<typeof AccountingPageContent>;
const now = new Date("2026-09-08T12:00:00Z");
const data = {
  month: { key: "2026-09", start: "2026-09-01", nextStart: "2026-10-01", label: "ספטמבר 2026" },
  summary: { totalIncome: "10.00", expenseTotal: "10.00", operatingNet: "0.00", taxPaid: "0.00", vatPaid: "0.00", cashNet: "0.00", openTaxOwed: "0.00", openVatOwed: "0.00", receivablesTotal: "0.00", trustBalance: "0.00" },
  clientPayments: [{ id: "client-payment", clientId: "client", clientName: "לקוח", matterId: null, matterTitle: null, recordDate: "2026-09-08", amount: "10.00", description: null, updatedAt: now }],
  incomeRows: [{ id: "income", recordDate: "2026-09-08", description: "ייעוץ", amount: "10.00", notes: null, updatedAt: now }],
  expenses: [{ id: "expense", recordDate: "2026-09-08", description: "תוכנה", amount: "10.00", category: null, documentLink: null, notes: null, updatedAt: now }],
  taxRows: [{ id: "tax", paymentKind: "tax", taxType: "income_tax", liabilityId: null, recordDate: "2026-09-08", amount: "10.00", period: null, description: null, documentLink: null, notes: null, updatedAt: now }],
  trustRows: [{ id: "trust", clientId: "client", clientName: "לקוח", matterId: null, matterTitle: null, transactionType: "release", recordDate: "2026-09-08", amount: "10.00", description: null, documentLink: null, updatedAt: now }],
  liabilities: [{ id: "liability", liabilityType: "tax", status: "open", amount: "10.00", dueDate: null, period: null, description: null, notes: null, updatedAt: now }],
  obligations: [{ id: "obligation", title: "דיווח", done: false, dueDate: null, type: null, period: null, amount: null, description: null, updatedAt: now }],
  legacyRecords: [{ id: "legacy", type: "היסטורי", recordDate: "2026-09-08", description: "רשומה קודמת", amount: null, documentLink: null, notes: null, updatedAt: now }],
  receivables: [],
  outgoingPayments: [
    { source: "expense", row: { id: "expense", recordDate: "2026-09-08", description: "תוכנה", amount: "10.00", category: null, documentLink: null, notes: null, updatedAt: now }, recordDate: "2026-09-08", description: "תוכנה", amount: "10.00", kind: "הוצאה" },
    { source: "tax", row: { id: "tax", paymentKind: "tax", taxType: "income_tax", liabilityId: null, recordDate: "2026-09-08", amount: "10.00", period: null, description: null, documentLink: null, notes: null, updatedAt: now }, recordDate: "2026-09-08", description: "מס", amount: "10.00", kind: "מס" },
    { source: "trust", row: { id: "trust", clientId: "client", matterId: null, clientName: "לקוח", matterTitle: null, transactionType: "release", recordDate: "2026-09-08", amount: "10.00", description: null, documentLink: null, updatedAt: now }, recordDate: "2026-09-08", description: "שחרור נאמנות", amount: "10.00", kind: "נאמנות" },
  ],
} as unknown as Props["data"];

describe("Accounting financial record presentation", () => {
  it("offers edit forms from every displayed financial record surface", () => {
    const html = renderToStaticMarkup(<AccountingPageContent data={data} today="2026-09-08" options={{ clients: [{ id: "client", name: "לקוח" }], matters: [], openLiabilities: [] }} />);
    for (const label of ["עריכת תשלום לקוח", "עריכת הכנסה", "עריכת הוצאה", "עריכת תשלום", "עריכת נאמנות", "עריכת סכום לתשלום", "עריכת התחייבות", "עריכת רשומה קודמת"]) expect(html).toContain(label);
    expect(html).toContain("ייעוץ");
    expect(html).toContain("תוכנה");
    expect(html).toContain("רשומה קודמת");
  });
});
