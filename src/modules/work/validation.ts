import { z } from "zod";
import { calendarDateSchema } from "@/modules/clients/validation";
import { fromJerusalemInput } from "./time";
import { importantDateTypes } from "./presentation";

const emptyToNull = (value: unknown) => value == null || (typeof value === "string" && !value.trim()) ? null : value;
const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max, `יש להזין עד ${max} תווים.`).nullable());
const title = z.string().trim().min(1, "יש להזין כותרת.").max(300, "הכותרת ארוכה מדי.");
const description = optionalText(10000);
export const workIdSchema = z.string().uuid();
export const workTimeSchema = z.iso.datetime({ local: true }).refine((value) => !value.startsWith("0000"))
  .transform((value, ctx) => {
    const instant = fromJerusalemInput(value);
    if (!instant) { ctx.addIssue({ code: "custom", message: "יש לבחור תאריך ושעה תקינים לפי שעון ישראל (השעה אינה קיימת במעבר לשעון קיץ)." }); return z.NEVER; }
    return instant;
  });

// Only editable fields are accepted; identity and completion cannot be mass-assigned.
export const taskSchema = z.object({ title, description,
  deadlineId: z.preprocess(emptyToNull, workIdSchema.nullable()),
});
const deadlineTimeSchema = z.preprocess(emptyToNull, z.string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "יש להזין שעה תקינה.").nullable());

// A deadline is ordinarily a calendar day. Time is deliberately opt-in; 17:00
// Israel time is the legal/product default when the user leaves it unset.
export const deadlineSchema = z.object({ title, description, deadlineDate: calendarDateSchema, deadlineTime: deadlineTimeSchema })
  .transform((value, ctx) => {
    const deadlineAt = fromJerusalemInput(`${value.deadlineDate}T${value.deadlineTime ?? "17:00"}`);
    if (!deadlineAt) {
      ctx.addIssue({ code: "custom", path: ["deadlineTime"], message: "יש להזין שעה תקינה לפי שעון ישראל." });
      return z.NEVER;
    }
    return { title: value.title, description: value.description, deadlineAt };
  });
export const newTaskDeadlineSchema = z.object({
  title,
  deadlineDate: calendarDateSchema,
  deadlineTime: deadlineTimeSchema,
}).transform((value, ctx) => {
  const deadlineAt = fromJerusalemInput(`${value.deadlineDate}T${value.deadlineTime ?? "17:00"}`);
  if (!deadlineAt) {
    ctx.addIssue({ code: "custom", path: ["deadlineTime"], message: "יש להזין שעה תקינה לפי שעון ישראל." });
    return z.NEVER;
  }
  return { title: value.title, deadlineAt };
});
export const importantDateSchema = z.object({ title, description, eventAt: workTimeSchema,
  type: optionalText(100).transform((value) => Object.entries(importantDateTypes).find(([, label]) => label === value)?.[0] ?? value),
});
export const taskDoneSchema = z.boolean();
