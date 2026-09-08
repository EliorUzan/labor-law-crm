import { z } from "zod";
import { clientStatus, financialRecordType } from "@/db/schema";

const emptyToNull = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim()) ? null : value;
const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
export const recordIdSchema = z.string().uuid();
const optionalId = z.preprocess(emptyToNull, recordIdSchema.nullable());
export const calendarDateSchema = z.iso.date().refine((value) => !value.startsWith("0000"));

export const clientSchema = z.object({
  name: z.string().trim().min(1, "יש להזין שם לקוח.").max(200, "שם הלקוח ארוך מדי."),
  phone: optionalText(50),
  email: z.preprocess(emptyToNull, z.string().trim().email("כתובת הדוא״ל אינה תקינה.").max(254).nullable()),
  address: optionalText(1000),
  notes: optionalText(10000),
  status: z.preprocess(emptyToNull, z.enum(clientStatus.enumValues).nullable()),
});

// numeric(14, 2): at most 12 whole digits. Reject rounding, exponents and negatives.
export const amountSchema = z.string().trim()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "יש להזין סכום חיובי עם עד שתי ספרות אחרי הנקודה.")
  .refine((value) => /[1-9]/.test(value), "הסכום חייב להיות גדול מאפס.")
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${BigInt(whole)}.${fraction.padEnd(2, "0")}`;
  });

export const financialRecordSchema = z.object({
  clientId: recordIdSchema,
  matterId: optionalId,
  type: z.enum(financialRecordType.enumValues),
  amount: amountSchema,
  recordDate: calendarDateSchema,
  description: optionalText(10000),
});

export const obligationSchema = z.object({
  clientId: recordIdSchema,
  matterId: optionalId,
  deadlineId: optionalId,
  title: z.string().trim().min(1, "יש להזין כותרת להתחייבות.").max(300),
  description: optionalText(10000),
  dueDate: z.preprocess(emptyToNull, calendarDateSchema.nullable()),
}).transform((value) => ({ ...value, dueDate: value.deadlineId ? null : value.dueDate }));

export const obligationCompletionSchema = z.object({
  clientId: recordIdSchema,
  obligationId: recordIdSchema,
  done: z.enum(["true", "false"]).transform((value) => value === "true"),
});
