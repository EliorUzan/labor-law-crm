import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createDatabaseClient } from "@/db/client";
import { documentDriveConnections } from "@/db/schema";
import { documentWebUrl, driveIdSchema, relativePathSchema } from "./validation";

export class DocumentError extends Error {}
export class GoogleDriveError extends DocumentError {
  constructor(message: string, readonly reason: "api-disabled" | "oauth-client" | "token-exchange" | "drive-access") { super(message); }
}
export function driveConfig() {
  const parsed = z.object({ clientId: z.string().min(1), clientSecret: z.string().min(1), key: z.string().regex(/^[a-fA-F0-9]{64}$/), origin: z.url() }).safeParse({
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID, clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    key: process.env.DOCUMENT_TOKEN_ENCRYPTION_KEY, origin: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) throw new DocumentError("חיבור Google Drive טרם הוגדר בשרת. יש להגדיר את פרטי OAuth ומפתח ההצפנה לפי מדריך המסמכים.");
  const url = new URL(parsed.data.origin);
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new DocumentError("כתובת היישום אינה תקינה.");
  return { ...parsed.data, origin: url.origin, callback: `${url.origin}/api/documents/google/callback` };
}
export function seal(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(driveConfig().key, "hex"), iv);
  return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]).toString("base64url");
}
export function unseal(value: string): unknown {
  const buffer = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(driveConfig().key, "hex"), buffer.subarray(0, 12));
  decipher.setAuthTag(buffer.subarray(-16));
  return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(12, -16)), decipher.final()]).toString());
}
export async function connection(owner: string) {
  const [row] = await createDatabaseClient().select().from(documentDriveConnections).where(eq(documentDriveConnections.ownerUserId, owner)).limit(1);
  return row ?? null;
}
const tokensSchema = z.object({ access_token: z.string(), refresh_token: z.string().optional() });
export async function exchangeTokens(values: Record<string, string>) {
  const config = driveConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ ...values, client_id: config.clientId, client_secret: config.clientSecret }), cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(await response.json().catch(() => null));
    throw new GoogleDriveError("החיבור ל-Google Drive פג או נדחה. יש להתחבר מחדש בהגדרות.", error.success && error.data.error === "invalid_client" ? "oauth-client" : "token-exchange");
  }
  return tokensSchema.parse(await response.json());
}
export async function driveFor(owner: string) {
  const row = await connection(owner);
  if (!row) throw new DocumentError("יש לחבר חשבון Google Drive בהגדרות.");
  const refreshToken = z.string().parse(unseal(row.refreshToken));
  const tokens = await exchangeTokens({ grant_type: "refresh_token", refresh_token: refreshToken });
  return { ...row, api: driveApi(tokens.access_token) };
}
export function driveApi(accessToken: string) {
  return async (endpoint: string, init: RequestInit = {}) => {
    const url = endpoint.startsWith("upload/") ? `https://www.googleapis.com/upload/drive/v3/${endpoint.slice(7)}` : `https://www.googleapis.com/drive/v3/${endpoint}`;
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers }, cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      const error = z.object({ error: z.object({ errors: z.array(z.object({ reason: z.string() })).optional(), details: z.array(z.object({ reason: z.string().optional() })).optional() }) }).safeParse(await response.json().catch(() => null));
      const disabled = error.success && (error.data.error.errors?.some((item) => item.reason === "accessNotConfigured") || error.data.error.details?.some((item) => item.reason === "SERVICE_DISABLED"));
      if (disabled) throw new GoogleDriveError("Google Drive API אינו מופעל בפרויקט Google Cloud. הפעילו אותו דרך APIs & Services → Library, המתינו כמה דקות וחברו שוב.", "api-disabled");
      throw new GoogleDriveError(response.status === 404 ? "הקובץ לא נמצא ב-Drive. ייתכן שטרם הסתיים הסנכרון או שאין הרשאה לקובץ." : "Google Drive לא השלים את הפעולה. בדקו חיבור והרשאות ונסו שוב.", "drive-access");
    }
    return response.status === 204 ? null : response.json();
  };
}
export type Drive = Awaited<ReturnType<typeof driveFor>>;
export const FOLDER = "application/vnd.google-apps.folder";
const fileSchema = z.object({ id: driveIdSchema, name: z.string().min(1).max(300), mimeType: z.string().max(255), parents: z.array(driveIdSchema).optional(), trashed: z.boolean().optional(), size: z.string().regex(/^\d+$/).refine((value) => Number.isSafeInteger(Number(value))).optional(), modifiedTime: z.iso.datetime().optional(), resourceKey: z.string().max(255).optional() });
export type DriveFile = z.infer<typeof fileSchema>;
const fields = "id,name,mimeType,parents,trashed,size,modifiedTime,resourceKey";
const quote = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
export async function driveFile(drive: Pick<Drive, "api">, id: string) {
  driveIdSchema.parse(id);
  const file = fileSchema.parse(await drive.api(`files/${id}?${new URLSearchParams({ fields, supportsAllDrives: "true" })}`));
  if (file.trashed || file.mimeType === "application/vnd.google-apps.shortcut") throw new DocumentError("הקובץ נמחק או שהוא קיצור דרך. יש לבחור את הקובץ המקורי בתוך התיקייה שהוגדרה.");
  return file;
}
export async function children(drive: Drive, parent: string, name?: string) {
  driveIdSchema.parse(parent);
  const all: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ q: `'${quote(parent)}' in parents and trashed = false${name === undefined ? "" : ` and name = '${quote(name)}'`}`, fields: `nextPageToken,files(${fields})`, pageSize: "100", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
    if (pageToken) query.set("pageToken", pageToken);
    const result = z.object({ files: z.array(fileSchema), nextPageToken: z.string().optional() }).parse(await drive.api(`files?${query}`));
    all.push(...result.files); pageToken = result.nextPageToken;
    if (all.length > 5000) throw new DocumentError("בתיקייה יש יותר מדי פריטים להצגה. יש לבחור תיקיית משנה.");
  } while (pageToken);
  return all;
}
export async function pathForFile(drive: Drive, file: DriveFile) {
  if (!drive.rootId) throw new DocumentError("יש לבחור תיקיית Drive בהגדרות.");
  const names: string[] = [];
  const seen = new Set<string>();
  let current = file;
  for (let depth = 0; depth < 100; depth++) {
    if (current.id === drive.rootId) return names.join("/");
    if (seen.has(current.id) || !current.parents || current.parents.length !== 1) break;
    seen.add(current.id); names.unshift(current.name);
    current = await driveFile(drive, current.parents[0]);
  }
  throw new DocumentError("לא ניתן להוסיף את הקובץ: הוא מחוץ לתיקיית Google Drive שהוגדרה בהגדרות. בחרו קובץ מתוך התיקייה או מתיקיות המשנה שלה. הקובץ לא הועבר ולא הועתק.");
}
export async function fileAtPath(drive: Drive, relativePath: string) {
  relativePathSchema.parse(relativePath);
  if (!drive.rootId) throw new DocumentError("יש לבחור תיקיית Drive בהגדרות.");
  let parent = drive.rootId;
  let file: DriveFile | undefined;
  for (const segment of relativePath.split("/")) {
    const matches = await children(drive, parent, segment);
    if (matches.length !== 1) throw new DocumentError(matches.length ? "ב-Drive יש כמה קבצים באותו נתיב. יש לתת להם שמות ייחודיים לפני ההוספה." : "הקובץ עדיין לא נמצא ב-Google Drive. המתינו לסיום הסנכרון ונסו להוסיף שוב.");
    file = matches[0]; parent = file.id;
    if (file.mimeType === "application/vnd.google-apps.shortcut") throw new DocumentError("אין תמיכה בקיצורי דרך. יש לבחור את הקובץ המקורי.");
  }
  return file!;
}
export async function ensureFolder(drive: Drive, parent: string, name: string) {
  const matches = await children(drive, parent, name);
  if (matches.length > 1 || (matches[0] && matches[0].mimeType !== FOLDER)) throw new DocumentError(`לא ניתן ליצור תיקייה: השם ${name} אינו ייחודי או שייך לקובץ.`);
  return matches[0] ?? fileSchema.parse(await drive.api(`files?fields=${fields}&supportsAllDrives=true`, { method: "POST", body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }) }));
}
export function metadata(file: DriveFile, relativePath: string) {
  relativePathSchema.parse(relativePath);
  if (file.mimeType === FOLDER) throw new DocumentError("יש לבחור מסמך ולא תיקייה.");
  const extension = file.name.includes(".") ? file.name.split(".").at(-1)!.toLowerCase() : null;
  return { displayName: file.name, relativePath, driveFileId: file.id, webUrl: documentWebUrl(file.id, file.name, file.mimeType, file.resourceKey), mimeType: file.mimeType, extension, sizeBytes: file.size ? Number(file.size) : null, fileModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null };
}
