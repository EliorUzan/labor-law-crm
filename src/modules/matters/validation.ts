import { z } from "zod";
import { calendarDateSchema } from "@/modules/clients/validation";

const emptyToNull = (value: unknown) => value == null || (typeof value === "string" && !value.trim()) ? null : value;
const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max, `יש להזין עד ${max} תווים.`).nullable());
export const matterStatuses = ["active", "waiting", "closed"] as const;

// Only editable fields: identity and Client ownership never come from form data.
export const matterSchema = z.object({
  title: z.string().trim().min(1, "יש להזין כותרת לתיק.").max(300, "כותרת התיק ארוכה מדי."),
  caseType: optionalText(200),
  status: z.preprocess(emptyToNull, z.enum(matterStatuses, { error: "יש לבחור סטטוס מהרשימה." }).nullable()),
  openDate: z.preprocess(emptyToNull, calendarDateSchema.nullable()),
  caseNumber: optionalText(200),
  courtOrTribunal: optionalText(300),
  opposingParty: optionalText(500),
  opposingAttorneyName: optionalText(200),
  opposingAttorneyPhone: optionalText(50),
  opposingAttorneyEmail: z.preprocess(emptyToNull, z.string().trim().email("כתובת הדוא״ל אינה תקינה.").max(254).nullable()),
  opposingAttorneyFirm: optionalText(300),
});

export const historySchema = z.object({
  eventDate: calendarDateSchema,
  title: z.string().trim().min(1, "יש להזין כותרת לאירוע.").max(300, "כותרת האירוע ארוכה מדי."),
  description: optionalText(10000),
});

export const matterNoteSchema = z.object({
  content: z.string().trim().min(1, "יש להזין תוכן להערה.").max(10000, "ההערה ארוכה מדי."),
});

export type MatterFields = z.infer<typeof matterSchema>;
export type HistoryFields = z.infer<typeof historySchema>;
export type MatterNoteFields = z.infer<typeof matterNoteSchema>;
