import { addAmounts, positiveAmount, subtractAmounts } from "./decimal";

type Amount = { amount: string };
type Payment = Amount & { paymentKind: "tax" | "vat" };
type Liability = Amount & { liabilityType: "tax" | "vat"; status: "open" | "paid" };
type Trust = Amount & { transactionType: "receipt" | "release" };

/** Exact, display-neutral monthly control totals. This is not formal bookkeeping. */
export function calculateAccountingSummary(input: {
  clientIncome: string;
  manualIncome: Amount[];
  expenses: Amount[];
  taxPayments: Payment[];
  liabilities: Liability[];
  clientBalances: string[];
  trustTransactions: Trust[];
}) {
  const manualIncomeTotal = addAmounts(...input.manualIncome.map((row) => row.amount));
  const expenseTotal = addAmounts(...input.expenses.map((row) => row.amount));
  const taxPaid = addAmounts(...input.taxPayments.filter((row) => row.paymentKind === "tax").map((row) => row.amount));
  const vatPaid = addAmounts(...input.taxPayments.filter((row) => row.paymentKind === "vat").map((row) => row.amount));
  const totalIncome = addAmounts(input.clientIncome, manualIncomeTotal);
  const operatingNet = subtractAmounts(totalIncome, expenseTotal);
  return {
    clientIncome: input.clientIncome,
    manualIncomeTotal,
    totalIncome,
    expenseTotal,
    operatingNet,
    taxPaid,
    vatPaid,
    cashNet: subtractAmounts(operatingNet, taxPaid, vatPaid),
    openTaxOwed: addAmounts(...input.liabilities.filter((row) => row.status === "open" && row.liabilityType === "tax").map((row) => row.amount)),
    openVatOwed: addAmounts(...input.liabilities.filter((row) => row.status === "open" && row.liabilityType === "vat").map((row) => row.amount)),
    receivablesTotal: addAmounts(...input.clientBalances.flatMap((balance) => positiveAmount(balance) ?? [])),
    trustBalance: addAmounts(...input.trustTransactions.map((row) => row.transactionType === "receipt" ? row.amount : `-${row.amount}`)),
  };
}
