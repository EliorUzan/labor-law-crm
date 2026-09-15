"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs/promises");
const path = require("node:path");

function parts(value) {
  if (typeof value !== "string" || !value || value.length > 2000 || value.includes("\\")) throw new Error("נתיב המסמך אינו תקין.");
  const result = value.split("/");
  if (result.some((part) => !part || part === "." || part === ".." || /[<>:"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error("נתיב המסמך אינו תקין.");
  return result;
}
function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}
async function resolveFile(root, relativePath) {
  const rootReal = await fs.realpath(root);
  let current = rootReal;
  for (const part of parts(relativePath)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) throw new Error("קישורים לתיקיות או לקבצים אינם נתמכים. יש לבחור את הקובץ המקורי בתוך תיקיית Drive שהוגדרה.");
    if (!inside(rootReal, await fs.realpath(current))) throw new Error("הקובץ נמצא מחוץ לתיקיית Drive המותרת.");
  }
  if (!(await fs.stat(current)).isFile()) throw new Error("יש לבחור קובץ ולא תיקייה.");
  return current;
}
async function describeFile(root, absolutePath) {
  const rootReal = await fs.realpath(root);
  if (typeof absolutePath !== "string" || !path.isAbsolute(absolutePath) || !inside(rootReal, absolutePath)) {
    throw new Error(`לא ניתן להוסיף את הקובץ: הוא נמצא מחוץ לתיקיית Google Drive שהוגדרה (${root}). מותר להוסיף רק קבצים בתוך תיקייה זו ובתיקיות המשנה שלה. יש להעביר את הקובץ ל-Drive באמצעות סייר הקבצים, להמתין לסנכרון ולבחור אותו שוב. ה-CRM לא העביר או העתיק את הקובץ.`);
  }
  const relativePath = path.relative(rootReal, absolutePath).split(path.sep).join("/");
  const resolved = await resolveFile(rootReal, relativePath);
  const stat = await fs.stat(resolved);
  return { relativePath, localPath: resolved, displayName: path.basename(resolved), sizeBytes: stat.size };
}
async function verifyRoot(candidate, proof) {
  if (!proof || !/^\.crm-verification-[a-f0-9]{32}\.txt$/.test(proof.name) || !/^[a-f0-9]{64}$/.test(proof.content)) throw new Error("יש להתחיל אימות תיקיית Drive בהגדרות.");
  try {
    const root = await fs.realpath(candidate);
    const file = await resolveFile(root, proof.name);
    if ((await fs.stat(file)).size > 256 || (await fs.readFile(file, "utf8")) !== proof.content) throw new Error("mismatch");
    const crm = path.join(root, "CRM");
    await fs.mkdir(crm).catch((error) => { if (error.code !== "EEXIST") throw error; });
    if ((await fs.lstat(crm)).isSymbolicLink() || !(await fs.stat(crm)).isDirectory() || !inside(root, await fs.realpath(crm))) throw new Error("invalid CRM folder");
    return root;
  } catch {
    throw new Error("התיקייה לא אומתה כתיקיית Google Drive המחוברת. קובץ האימות שנוצר ב-Drive לא נמצא בה או אינו תואם. יש לבחור את אותה תיקייה שנבחרה ב-Drive, לוודא ש-Drive למחשב פועל ולהמתין לסיום הסנכרון לפני ניסיון נוסף. ההגדרה הקודמת נשמרה.");
  }
}

function installDocumentHandlers({ ipcMain, dialog, shell, app, crmUrl, contextFor }) {
  const settingsPath = path.join(app.getPath("userData"), "document-roots.json");
  async function settings() {
    try { return JSON.parse(await fs.readFile(settingsPath, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return {}; throw error; }
  }
  function handle(name, operation) {
    ipcMain.handle(`documents:${name}`, async (event, input) => {
      try {
        if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame || new URL(event.senderFrame.url).origin !== crmUrl.origin) throw new Error("גישה לא מורשית.");
        const context = await contextFor(event.sender.session);
        const key = `${crmUrl.origin}|${context.ownerUserId}|${context.rootId}`;
        const roots = await settings();
        return { ok: true, value: await operation({ event, input, context, key, roots, root: roots[key] }) };
      } catch (error) {
        return { ok: false, error: error.code ? "הקובץ או התיקייה אינם זמינים. בדקו ש-Google Drive פועל ושהקובץ מסונכרן ונגיש במחשב." : error.message };
      }
    });
  }
  function requireRoot(root) { if (typeof root !== "string") throw new Error("יש להגדיר ולאמת תיקיית Google Drive במחשב זה דרך ההגדרות."); }
  handle("settings", async ({ root }) => ({ localRoot: root ?? null }));
  handle("choose-root", async ({ context, roots, key }) => {
    const result = await dialog.showOpenDialog({ title: "בחירת תיקיית Google Drive התואמת לתיקייה בענן", properties: ["openDirectory"] });
    if (result.canceled) return null;
    const root = await verifyRoot(result.filePaths[0], context.proof);
    roots[key] = root;
    await fs.writeFile(settingsPath, JSON.stringify(roots), { mode: 0o600 });
    return { localRoot: root };
  });
  handle("choose-files", async ({ root }) => {
    requireRoot(root);
    const result = await dialog.showOpenDialog({ defaultPath: root, properties: ["openFile", "multiSelections"] });
    if (result.canceled) return [];
    return Promise.all(result.filePaths.map((file) => describeFile(root, file)));
  });
  handle("dropped-files", async ({ root, input }) => {
    requireRoot(root);
    if (!Array.isArray(input) || input.length < 1 || input.length > 100) throw new Error("ניתן להוסיף עד 100 קבצים בכל פעם.");
    return Promise.all(input.map((file) => describeFile(root, file)));
  });
  handle("open", async ({ root, input }) => {
    requireRoot(root);
    const file = await resolveFile(root, input);
    const extension = path.extname(file).toLowerCase();
    if (![".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf", ".txt", ".rtf", ".csv", ".png", ".jpg", ".jpeg", ".odt", ".ods"].includes(extension)) throw new Error("פתיחה מקומית של סוג קובץ זה אינה נתמכת. ניתן לפתוח אותו דרך Google Drive בדפדפן.");
    const error = await shell.openPath(file);
    if (error) throw new Error("מערכת ההפעלה לא הצליחה לפתוח את המסמך. בדקו שמותקנת תוכנה המתאימה לסוג הקובץ ושהוא זמין במחשב.");
    return { localPath: file };
  });
}
module.exports = { parts, inside, resolveFile, describeFile, verifyRoot, installDocumentHandlers };
