import { z } from "zod";

const resultSchema = z.discriminatedUnion("ok", [z.object({ ok: z.literal(true), value: z.unknown() }), z.object({ ok: z.literal(false), error: z.string() })]);
async function result<T>(request: Promise<unknown>, schema: z.ZodType<T>) {
  const value = resultSchema.parse(await request.catch((error: unknown) => {
    if (error instanceof Error && /No handler registered for ['"]documents:/.test(error.message)) {
      throw new Error("יש לסגור את יישום ה-CRM למחשב ולפתוח אותו מחדש כדי להפעיל את תמיכת המסמכים המעודכנת. רענון הדף בלבד אינו מספיק. בינתיים אפשר להשתמש בפתיחה ב-Google Drive.");
    }
    throw error;
  }));
  if (!value.ok) throw new Error(value.error);
  return schema.parse(value.value);
}
function bridge() {
  if (typeof window === "undefined" || !window.crmDesktop) throw new Error("פעולה זו זמינה ביישום למחשב בלבד.");
  return window.crmDesktop;
}
const selectedFiles = z.array(z.object({ relativePath: z.string(), localPath: z.string(), displayName: z.string(), sizeBytes: z.number() }));
export const desktopDocuments = {
  settings: () => result(bridge().documentSettings(), z.object({ localRoot: z.string().nullable() })),
  chooseRoot: () => result(bridge().chooseDocumentRoot(), z.object({ localRoot: z.string() }).nullable()),
  choose: () => result(bridge().chooseDocuments(), selectedFiles),
  drop: (files: File[]) => result(bridge().droppedDocuments(files), selectedFiles),
  open: (relativePath: string) => result(bridge().openDocument(relativePath), z.object({ localPath: z.string() })),
};
