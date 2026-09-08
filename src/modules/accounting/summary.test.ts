import { describe, expect, it } from "vitest";
import { calculateAccountingSummary } from "./summary";
import { accountingMonth } from "./queries";

describe("Accounting financial-control invariants", () => {
  it("uses a date-only selected month with safe navigation boundaries", () => {
    expect(accountingMonth("2026-09")).toMatchObject({ key: "2026-09", start: "2026-09-01", nextStart: "2026-10-01" });
    expect(accountingMonth("bad", new Date("2026-01-15T12:00:00Z")).key).toBe("2026-01");
  });
  it("counts Client payments as income, excludes charges, and derives only positive receivables", () => {
    const result = calculateAccountingSummary({ clientIncome: "4000.00", manualIncome: [], expenses: [], taxPayments: [], liabilities: [], clientBalances: ["6000.00", "0.00", "-15.00"], trustTransactions: [] });
    expect(result.totalIncome).toBe("4000.00"); expect(result.receivablesTotal).toBe("6000.00");
  });
  it("keeps manual income, expenses, tax/VAT payments and cash net distinct using exact decimals", () => {
    const result = calculateAccountingSummary({ clientIncome: "4000.00", manualIncome: [{ amount: "1000.00" }], expenses: [{ amount: "850.50" }], taxPayments: [{ paymentKind: "tax", amount: "400.00" }, { paymentKind: "vat", amount: "520.25" }], liabilities: [], clientBalances: [], trustTransactions: [] });
    expect(result.totalIncome).toBe("5000.00"); expect(result.expenseTotal).toBe("850.50"); expect(result.operatingNet).toBe("4149.50"); expect(result.cashNet).toBe("3229.25");
  });
  it("keeps trust receipts/releases out of income, client balance and operating net", () => {
    const result = calculateAccountingSummary({ clientIncome: "0.00", manualIncome: [], expenses: [], taxPayments: [], liabilities: [], clientBalances: ["6000.00"], trustTransactions: [{ transactionType: "receipt", amount: "30000.00" }, { transactionType: "release", amount: "12000.00" }] });
    expect(result.trustBalance).toBe("18000.00"); expect(result.totalIncome).toBe("0.00"); expect(result.operatingNet).toBe("0.00"); expect(result.receivablesTotal).toBe("6000.00");
  });
  it("uses exact values when evaluating a trust release against an existing balance", async () => {
    const { isNegativeAmount, subtractAmounts } = await import("./decimal");
    expect(isNegativeAmount(subtractAmounts("0.10", "0.11"))).toBe(true);
    expect(isNegativeAmount(subtractAmounts("0.10", "0.10"))).toBe(false);
  });
  it("shows only open tax and VAT liabilities while paid liabilities stay historical", () => {
    const result = calculateAccountingSummary({ clientIncome: "0.00", manualIncome: [], expenses: [], taxPayments: [], liabilities: [{ liabilityType: "tax", status: "open", amount: "6000.00" }, { liabilityType: "vat", status: "open", amount: "3400.00" }, { liabilityType: "vat", status: "paid", amount: "999.00" }], clientBalances: [], trustTransactions: [] });
    expect(result.openTaxOwed).toBe("6000.00"); expect(result.openVatOwed).toBe("3400.00");
  });
});
