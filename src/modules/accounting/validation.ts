import { z } from "zod";
import { accountingLiabilityType, taxPaymentKind, trustTransactionType } from "@/db/schema";
import { amountSchema, calendarDateSchema, recordIdSchema } from "@/modules/clients/validation";

const emptyToNull = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim()) ? null : value;
const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
const optionalAmount = z.preprocess(emptyToNull, amountSchema.nullable());
const optionalId = z.preprocess(emptyToNull, recordIdSchema.nullable());

export const manualIncomeSchema = z.object({ recordDate: calendarDateSchema, description: z.string().trim().min(1, "יש להזין תיאור.").max(10000), amount: amountSchema, notes: optionalText(10000) });
export const expenseSchema = z.object({ recordDate: calendarDateSchema, description: z.string().trim().min(1, "יש להזין תיאור.").max(10000), amount: amountSchema, category: optionalText(100), documentLink: optionalText(2048), notes: optionalText(10000) });
export const trustTransactionSchema = z.object({ clientId: recordIdSchema, matterId: optionalId, transactionType: z.enum(trustTransactionType.enumValues), recordDate: calendarDateSchema, amount: amountSchema, description: optionalText(10000), documentLink: optionalText(2048) });
export const taxPaymentSchema = z.object({ paymentKind: z.enum(taxPaymentKind.enumValues), taxType: optionalText(100), liabilityId: optionalId, recordDate: calendarDateSchema, amount: amountSchema, period: optionalText(100), description: optionalText(10000), documentLink: optionalText(2048), notes: optionalText(10000) }).superRefine((value, context) => {
  if (value.paymentKind === "tax" && !value.taxType) context.addIssue({ code: "custom", path: ["taxType"], message: "יש לבחור או להזין סוג מס." });
});
export const accountingLiabilitySchema = z.object({ liabilityType: z.enum(accountingLiabilityType.enumValues), amount: amountSchema, dueDate: z.preprocess(emptyToNull, calendarDateSchema.nullable()), period: optionalText(100), description: optionalText(10000), notes: optionalText(10000) });
export const accountingObligationSchema = z.object({ title: z.string().trim().min(1, "יש להזין כותרת.").max(300), dueDate: z.preprocess(emptyToNull, calendarDateSchema.nullable()), type: optionalText(100), period: optionalText(100), amount: optionalAmount, description: optionalText(10000) });
export type ManualIncomeFields = z.infer<typeof manualIncomeSchema>;
export type ExpenseFields = z.infer<typeof expenseSchema>;
export type TrustTransactionFields = z.infer<typeof trustTransactionSchema>;
export type TaxPaymentFields = z.infer<typeof taxPaymentSchema>;
export type AccountingLiabilityFields = z.infer<typeof accountingLiabilitySchema>;
export type AccountingObligationFields = z.infer<typeof accountingObligationSchema>;
