import { z } from "zod";

export const documentTargetTypes = ["client", "matter", "financial_record", "client_obligation", "task", "deadline", "important_date", "matter_history", "matter_note", "office_expense", "manual_income", "trust_transaction", "tax_payment", "accounting_liability", "accounting_obligation"] as const;
export const targetSchema = z.object({ type: z.enum(documentTargetTypes), id: z.uuid() });
export type DocumentTarget = z.infer<typeof targetSchema>;
export const driveIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
export function normalizeDocumentRelativePath(value: string): string | null {
  const path = value.trim().replaceAll("\\", "/").replace(/\/+/g, "/");
  if (!path || path.length > 2000 || path.split("/").some((part) => !part || part === "." || part === ".." || /[<>:"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) return null;
  return path;
}
export const relativePathSchema = z.string().refine((value) => normalizeDocumentRelativePath(value) === value, "נתיב לא תקין");
export function driveIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !["drive.google.com", "docs.google.com"].includes(url.hostname)) return null;
    const id = url.pathname.match(/\/(?:d|folders)\/([A-Za-z0-9_-]+)/)?.[1] ?? url.searchParams.get("id");
    return driveIdSchema.safeParse(id).success ? id : null;
  } catch { return null; }
}
export function documentWebUrl(id: string, name: string, mimeType: string, resourceKey?: string) {
  driveIdSchema.parse(id);
  const extension = name.split(".").at(-1)?.toLowerCase();
  const app = mimeType === "application/vnd.google-apps.document" || ["doc", "docx", "odt", "rtf"].includes(extension ?? "") ? "document"
    : mimeType === "application/vnd.google-apps.spreadsheet" || ["xls", "xlsx", "ods"].includes(extension ?? "") ? "spreadsheets"
    : mimeType === "application/vnd.google-apps.presentation" || ["ppt", "pptx"].includes(extension ?? "") ? "presentation" : null;
  const url = new URL(app ? `https://docs.google.com/${app}/d/${id}/edit` : `https://drive.google.com/file/d/${id}/view`);
  if (resourceKey) url.searchParams.set("resourcekey", resourceKey);
  return url.href;
}
export function folderSegment(name: string, id: string) {
  // IDs avoid mixing records with identical names and keep names recognizable.
  return `${name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "").slice(0, 80) || "רשומה"} (${id})`;
}
