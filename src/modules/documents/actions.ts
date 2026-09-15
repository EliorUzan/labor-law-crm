"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { createDatabaseClient } from "@/db/client";
import { documentDriveConnections, documents } from "@/db/schema";
import { children, connection, DocumentError, driveConfig, driveFile, driveFor, ensureFolder, fileAtPath, FOLDER, metadata, pathForFile, seal } from "./google-drive";
import { createDocumentForTarget, getDocument, listDocumentsForTarget, targetExistsForOwner, unlinkDocumentFromTarget } from "./service";
import { driveIdFromUrl, driveIdSchema, relativePathSchema, targetSchema } from "./validation";
import { rootProof } from "./root-proof";
import { managedFolderSegments } from "./managed-folders";

async function run<T>(operation: (owner: string) => Promise<T>) {
  const owner = await requireAuthenticatedUserId();
  try { return { ok: true as const, value: await operation(owner) }; }
  catch (error) { return { ok: false as const, error: error instanceof DocumentError ? error.message : error instanceof z.ZodError ? "הנתונים אינם תקינים. בדקו את הקישור או שם הקובץ." : "לא ניתן להשלים את פעולת המסמכים. נסו שוב; אם התקלה נמשכת בדקו את חיבור Drive ואת הגדרת מסד הנתונים." }; }
}
export async function documentSettings() {
  return run(async (owner) => {
    let configured = true;
    try { driveConfig(); } catch { configured = false; }
    const drive = await connection(owner);
    return { configured, connected: Boolean(drive), rootId: drive?.rootId ?? null, rootName: drive?.rootName ?? null };
  });
}
export async function setDriveRoot(input: unknown) {
  return run(async (owner) => {
    const value = z.string().max(2000).parse(input);
    const id = value === "root" ? "root" : driveIdFromUrl(value);
    if (!id) throw new DocumentError("יש להזין קישור לתיקיית Google Drive, או לבחור באפשרות 'האחסון שלי'.");
    const drive = await driveFor(owner);
    const folder = await driveFile(drive, id);
    if (folder.mimeType !== FOLDER) throw new DocumentError("הקישור אינו לתיקיית Google Drive.");
    if (drive.rootId && drive.rootId !== folder.id) {
      const [existing] = await createDatabaseClient().select({ id: documents.id }).from(documents).where(eq(documents.ownerUserId, owner)).limit(1);
      if (existing) throw new DocumentError("לא ניתן להחליף את תיקיית הבסיס כשכבר קיימים מסמכים. שינוי כזה יפנה את הנתיבים לקבצים אחרים.");
    }
    await ensureFolder(drive, folder.id, "CRM");
    await createDatabaseClient().update(documentDriveConnections).set({ rootId: folder.id, rootName: folder.name, updatedAt: new Date() }).where(eq(documentDriveConnections.ownerUserId, owner));
    refresh(); return { rootId: folder.id, rootName: folder.name };
  });
}
export async function beginRootVerification() {
  return run(async (owner) => {
    const drive = await driveFor(owner);
    if (!drive.rootId) throw new DocumentError("יש לבחור תחילה תיקיית Drive בענן.");
    const previous = await rootProof(owner, drive.rootId);
    if (previous) return { name: previous.name };
    const name = `.crm-verification-${randomBytes(16).toString("hex")}.txt`;
    const content = randomBytes(32).toString("hex");
    const file = z.object({ id: driveIdSchema }).parse(await drive.api("files?fields=id&supportsAllDrives=true", { method: "POST", body: JSON.stringify({ name, mimeType: "text/plain", parents: [drive.rootId] }) }));
    try {
      await drive.api(`upload/files/${file.id}?uploadType=media&supportsAllDrives=true`, { method: "PATCH", headers: { "Content-Type": "text/plain" }, body: content });
    } catch (error) { await drive.api(`files/${file.id}?supportsAllDrives=true`, { method: "DELETE" }).catch(() => {}); throw error; }
    (await cookies()).set("crm-drive-proof", seal({ owner, rootId: drive.rootId, name, content, fileId: file.id, expires: Date.now() + 3600000 }), { httpOnly: true, secure: driveConfig().origin.startsWith("https:"), sameSite: "strict", path: "/", maxAge: 3600 });
    return { name };
  });
}
export async function finishRootVerification() {
  return run(async (owner) => {
    const drive = await driveFor(owner);
    const proof = await rootProof(owner, drive.rootId);
    if (proof) await drive.api(`files/${proof.fileId}?supportsAllDrives=true`, { method: "DELETE" });
    (await cookies()).delete("crm-drive-proof");
    return null;
  });
}
export async function browseDrive(input?: unknown) {
  return run(async (owner) => {
    const drive = await driveFor(owner);
    if (!drive.rootId) throw new DocumentError("יש לבחור תיקיית Drive בהגדרות.");
    const id = input ? driveIdSchema.parse(input) : drive.rootId;
    const folder = await driveFile(drive, id);
    if (folder.mimeType !== FOLDER) throw new DocumentError("יש לבחור תיקייה.");
    await pathForFile(drive, folder);
    return { id, name: folder.name, files: (await children(drive, id)).filter((file) => file.mimeType !== "application/vnd.google-apps.shortcut" && !file.name.startsWith(".crm-verification-")) };
  });
}
export async function listTargetDocuments(input: unknown) {
  return run(async (owner) => listDocumentsForTarget(owner, targetSchema.parse(input)));
}
export async function addDocument(input: unknown) {
  return run(async (owner) => {
    const parsed = z.object({ target: targetSchema, relativePath: relativePathSchema.optional(), fileId: driveIdSchema.optional(), url: z.string().max(2000).optional() }).parse(input);
    if (!await targetExistsForOwner(owner, parsed.target)) throw new DocumentError("הרשומה לא נמצאה או שאין הרשאה אליה.");
    const drive = await driveFor(owner);
    const id = parsed.fileId ?? (parsed.url ? driveIdFromUrl(parsed.url) : null);
    if (!id && !parsed.relativePath) throw new DocumentError("בחרו קובץ מתוך תיקיית Drive שהוגדרה.");
    const file = id ? await driveFile(drive, id) : await fileAtPath(drive, parsed.relativePath!);
    const relativePath = await pathForFile(drive, file);
    const document = await createDocumentForTarget(owner, parsed.target, metadata(file, relativePath));
    if (!document) throw new DocumentError("לא ניתן לרשום את המסמך. ייתכן שקובץ אחר כבר רשום באותו נתיב.");
    refresh(); return document;
  });
}
export async function createManagedDocument(input: unknown) {
  return run(async (owner) => {
    const parsed = z.object({ target: targetSchema, name: z.string().trim().min(1).max(150), templateId: driveIdSchema.optional(), kind: z.enum(["document", "spreadsheet"]).optional() }).parse(input);
    if (!relativePathSchema.safeParse(parsed.name).success || parsed.name.includes("/")) throw new DocumentError("שם הקובץ אינו תקין.");
    const segments = await managedFolderSegments(owner, parsed.target);
    const drive = await driveFor(owner);
    if (!drive.rootId) throw new DocumentError("יש לבחור תיקיית Drive בהגדרות.");
    let source;
    if (parsed.templateId) {
      source = await driveFile(drive, parsed.templateId);
      await pathForFile(drive, source);
      if (source.mimeType === FOLDER) throw new DocumentError("תבנית חייבת להיות קובץ.");
      const extension = source.name.match(/\.[^.]+$/)?.[0];
      if (!source.mimeType.startsWith("application/vnd.google-apps.") && extension && !parsed.name.toLowerCase().endsWith(extension.toLowerCase())) throw new DocumentError(`שם הקובץ החדש חייב להסתיים ב-${extension}.`);
    } else if (!parsed.kind) throw new DocumentError("בחרו סוג מסמך או תבנית.");
    let parent = drive.rootId;
    for (const segment of segments) parent = (await ensureFolder(drive, parent, segment)).id;
    if ((await children(drive, parent, parsed.name)).length) throw new DocumentError("כבר קיים קובץ בשם זה בתיקיית היעד. בחרו שם אחר; הקובץ הקיים לא השתנה.");
    const result = z.object({ id: driveIdSchema }).parse(await drive.api(source ? `files/${source.id}/copy?fields=id&supportsAllDrives=true` : "files?fields=id&supportsAllDrives=true", { method: "POST", body: JSON.stringify({ name: parsed.name, parents: [parent], ...(!source ? { mimeType: parsed.kind === "spreadsheet" ? "application/vnd.google-apps.spreadsheet" : "application/vnd.google-apps.document" } : {}) }) }));
    try {
      const file = await driveFile(drive, result.id);
      const document = await createDocumentForTarget(owner, parsed.target, metadata(file, `${segments.join("/")}/${file.name}`));
      if (!document) throw new Error("Metadata registration failed");
      refresh(); return document;
    } catch {
      throw new DocumentError("הקובץ נוצר ב-Drive אך הרישום ב-CRM נכשל. הוסיפו את הקובץ הקיים דרך בחירה מ-Drive; אין צורך ליצור אותו שוב.");
    }
  });
}
export async function resolveDocument(input: unknown) {
  return run(async (owner) => {
    const id = z.uuid().parse(input);
    const document = await getDocument(owner, id);
    if (!document) throw new DocumentError("המסמך לא נמצא.");
    const drive = await driveFor(owner);
    const file = document.driveFileId ? await driveFile(drive, document.driveFileId) : await fileAtPath(drive, document.relativePath);
    const updated = metadata(file, await pathForFile(drive, file));
    await createDatabaseClient().update(documents).set({ ...updated, updatedAt: new Date() }).where(and(eq(documents.id, id), eq(documents.ownerUserId, owner)));
    return updated;
  });
}
export async function unlinkDocument(input: unknown) {
  return run(async (owner) => {
    const parsed = z.object({ target: targetSchema, documentId: z.uuid() }).parse(input);
    if (!await unlinkDocumentFromTarget(owner, parsed.documentId, parsed.target)) throw new DocumentError("המסמך או הרשומה לא נמצאו.");
    refresh(); return null;
  });
}
