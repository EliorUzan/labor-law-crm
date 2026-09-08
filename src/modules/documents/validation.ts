import { z } from "zod";

const emptyToNull = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim()) ? null : value;

const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

export const documentReferenceSchema = z.object({
  displayName: z.string().trim().min(1, "יש להזין שם למסמך.").max(300, "שם המסמך ארוך מדי."),
  location: z.string().trim().min(1, "יש להזין מיקום או קישור למסמך.").max(2048, "המיקום או הקישור ארוכים מדי."),
  category: optionalText(100),
  provider: optionalText(50),
  notes: optionalText(10000),
});

/** Returns only ordinary HTTPS URLs that are safe to expose as browser links. */
export function getSafeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** Server-side validation for fields that are intended to be external links. */
export const optionalSafeHttpsUrlSchema = z.preprocess(
  emptyToNull,
  z.string().trim().max(2048, "הקישור ארוך מדי.")
    .refine((value) => getSafeHttpsUrl(value) !== null, "יש להזין קישור HTTPS תקין ללא פרטי התחברות.")
    .nullable(),
);

export type DocumentReferenceFields = z.infer<typeof documentReferenceSchema>;
