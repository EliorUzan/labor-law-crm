"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { buttonClass, inputClass } from "@/modules/clients/presentation";
import { getCrmPlatformCapabilities } from "@/lib/desktop-bridge";
import { addDocument, browseDrive, createManagedDocument, listTargetDocuments, unlinkDocument } from "./actions";
import { desktopDocuments } from "./desktop";
import type { DocumentTarget } from "./validation";
import type { DriveFile } from "./google-drive";

type Listed = Extract<Awaited<ReturnType<typeof listTargetDocuments>>, { ok: true }>['value'];
type BrowserFolder = Extract<Awaited<ReturnType<typeof browseDrive>>, { ok: true }>['value'];
const folderMime = "application/vnd.google-apps.folder";

/** Documents stay on their substantive parent; this is never a document detail page. */
export function DocumentPanel({ target, expanded = false }: { target: DocumentTarget; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded);
  const [desktop, setDesktop] = useState(false);
  const [documents, setDocuments] = useState<Listed>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [folder, setFolder] = useState<BrowserFolder | null>(null);
  const [parents, setParents] = useState<string[]>([]);
  const [pickerMode, setPickerMode] = useState<"link" | "template">("link");
  const [template, setTemplate] = useState<DriveFile | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"document" | "spreadsheet">("document");
  const [newForm, setNewForm] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localRoot, setLocalRoot] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const selection = { type: target.type, id: target.id };
    void Promise.all([getCrmPlatformCapabilities(), listTargetDocuments(selection)]).then(async ([capabilities, result]) => {
      if (!active) return;
      setDesktop(capabilities.platform === "desktop");
      if (result.ok) { setDocuments(result.value); setLoaded(true); } else setMessage(result.error);
      if (capabilities.platform === "desktop") {
        try { const settings = await desktopDocuments.settings(); if (active) setLocalRoot(settings.localRoot); } catch { /* Settings link remains visible. */ }
      }
    }).catch(() => { if (active) setMessage("טעינת המסמכים נכשלה. נסו לסגור ולפתוח את האזור שוב."); });
    return () => { active = false; };
  }, [open, target.id, target.type]);

  async function reload() { const result = await listTargetDocuments(target); if (!result.ok) throw new Error(result.error); setDocuments(result.value); setLoaded(true); }
  function action(operation: () => Promise<void>) {
    startTransition(async () => { setMessage(""); try { await operation(); } catch (error) { setMessage(error instanceof Error ? error.message : "הפעולה נכשלה."); } });
  }
  async function add(input: { relativePath?: string; fileId?: string; url?: string }) {
    const result = await addDocument({ target, ...input });
    if (!result.ok) throw new Error(result.error);
  }
  async function addLocal(files: Awaited<ReturnType<typeof desktopDocuments.choose>>) {
    let added = 0;
    try { for (const file of files) { await add({ relativePath: file.relativePath }); added++; } }
    catch (error) { throw new Error(`${added ? `${added} מסמכים נוספו. ` : ""}${error instanceof Error ? error.message : "ההוספה נכשלה."}`); }
    finally { await reload(); }
    if (added) setMessage(`${added} מסמכים נוספו ללא שינוי מיקום הקבצים.`);
  }
  async function browse(id?: string) { const result = await browseDrive(id); if (!result.ok) throw new Error(result.error); setFolder(result.value); }
  function openLocal(document: Listed[number]) {
    action(async () => {
      if (document.mimeType?.startsWith("application/vnd.google-apps.")) throw new Error("זהו מסמך Google שנפתח בדפדפן. לפתיחה ב-Word או Excel יש להשתמש בקובץ בפורמט Word או Excel. לחצו על פתיחה ב-Google Drive.");
      const result = await desktopDocuments.open(document.relativePath);
      setMessage(`המסמך נפתח: ${result.localPath}`);
    });
  }
  async function pick(file: DriveFile) {
    if (file.mimeType === folderMime) { if (folder) setParents([...parents, folder.id]); await browse(file.id); return; }
    if (pickerMode === "template") { setTemplate(file); setName(file.name); setFolder(null); return; }
    await add({ fileId: file.id }); await reload(); setMessage("המסמך נוסף ללא שינוי מיקום הקובץ.");
  }
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-3 rounded-lg border border-stone-200 bg-white p-3">
    <summary className="cursor-pointer font-medium text-teal-800">מסמכים</summary>
    {open && <div className="mt-3 space-y-3" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => {
      event.preventDefault(); setDragging(false);
      if (pending) return;
      const files = Array.from(event.dataTransfer.files);
      const url = event.dataTransfer.getData("text/uri-list").split(/\r?\n/).find((line) => line && !line.startsWith("#")) ?? event.dataTransfer.getData("text/plain");
      action(async () => {
        if (files.length) {
          if (!desktop) throw new Error("לא ניתן לאמת את מיקום הקובץ המקומי בדפדפן. בחרו אותו באמצעות 'בחירה מ-Drive', או גררו קישור לקובץ ב-Google Drive. לגרירת קובץ מסייר הקבצים יש להשתמש ביישום למחשב.");
          await addLocal(await desktopDocuments.drop(files));
        } else { await add({ url }); await reload(); setMessage("המסמך נוסף."); }
      });
    }}>
      <div className={`rounded-lg border-2 border-dashed p-4 text-sm ${dragging ? "border-teal-600 bg-teal-50" : "border-stone-200"}`}>
        <p>{desktop ? "גררו לכאן קבצים מתוך תיקיית Drive שהוגדרה" : "גררו לכאן קישור לקובץ ב-Google Drive, או בחרו קובץ מ-Drive"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {desktop && <button type="button" disabled={pending} className={buttonClass} onClick={() => action(async () => addLocal(await desktopDocuments.choose()))}>בחירת קבצים מהמחשב</button>}
          <button type="button" disabled={pending} className={buttonClass} onClick={() => action(async () => { setPickerMode("link"); setParents([]); await browse(); })}>בחירה מ-Drive</button>
          <button type="button" disabled={pending} className={buttonClass} onClick={() => setNewForm(!newForm)}>מסמך חדש</button>
          <Link className="self-center text-teal-700 underline" href="/settings">הגדרות Drive</Link>
        </div>
      </div>
      {newForm && <form className="space-y-3 rounded-lg bg-stone-50 p-3" onSubmit={(event) => { event.preventDefault(); action(async () => {
        const result = await createManagedDocument({ target, name, ...(template ? { templateId: template.id } : { kind }) });
        if (!result.ok) throw new Error(result.error);
        setNewForm(false); setName(""); setTemplate(null); await reload(); setMessage("המסמך נוצר בתיקיית CRM לפי הלקוח והתיק. לפתיחה מקומית יש להמתין לסנכרון Drive.");
      }); }}>
        <h3 className="font-semibold">מסמך חדש בתיקיית CRM</h3>
        <p className="text-sm text-stone-600">ליצירת קובץ Word או Excel בחרו קובץ קיים ב-Drive כתבנית. תיווצר העתקה חדשה; המקור יישאר במקומו.</p>
        <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={pending} onClick={() => action(async () => { setPickerMode("template"); setParents([]); await browse(); })}>בחירת תבנית מ-Drive</button>{template && <button type="button" className={buttonClass} onClick={() => setTemplate(null)}>הסרת תבנית</button>}</div>
        {template ? <p className="text-sm">תבנית: <bdi>{template.name}</bdi></p> : <label className="block text-sm">סוג מסמך<select className={`${inputClass} mt-1`} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="document">Google Docs</option><option value="spreadsheet">Google Sheets</option></select></label>}
        <label className="block text-sm">שם המסמך<input required className={`${inputClass} mt-1`} dir="auto" value={name} maxLength={150} onChange={(event) => setName(event.target.value)} /></label>
        <button className={buttonClass} disabled={pending}>יצירת מסמך</button>
      </form>}
      {folder && <section className="space-y-2 rounded-lg border border-teal-200 p-3" aria-label="בחירת קובץ מ-Google Drive">
        <header className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{pickerMode === "template" ? "בחירת תבנית" : "בחירת מסמך"}: <bdi>{folder.name}</bdi></h3><button type="button" className={buttonClass} onClick={() => setFolder(null)}>סגירה</button></header>
        {parents.length > 0 && <button type="button" disabled={pending} className={buttonClass} onClick={() => action(async () => { await browse(parents.at(-1)); setParents(parents.slice(0, -1)); })}>חזרה לתיקייה הקודמת</button>}
        <ul className="max-h-72 overflow-auto divide-y divide-stone-100">{folder.files.map((file) => <li key={file.id}><button type="button" disabled={pending} className="w-full break-words p-2 text-start hover:bg-teal-50" onClick={() => action(async () => pick(file))}>{file.mimeType === folderMime ? "📁 " : "📄 "}<bdi>{file.name}</bdi></button></li>)}</ul>
        {!folder.files.length && <p className="text-sm text-stone-500">התיקייה ריקה.</p>}
      </section>}
      {pending && <p role="status" className="text-sm">מבצע פעולה…</p>}
      {message && <p role="status" className="whitespace-pre-wrap text-sm text-stone-700">{message}</p>}
      {loaded && !documents.length && <p className="text-sm text-stone-500">אין מסמכים משויכים.</p>}
      <ul className="divide-y divide-stone-100">{documents.map((document) => <li key={document.id} className="space-y-1 py-3">
        {desktop && !document.mimeType?.startsWith("application/vnd.google-apps.") ? <button type="button" className="break-words text-start font-medium text-teal-800 underline" disabled={pending} onClick={() => openLocal(document)}><bdi>{document.displayName}</bdi></button>
          : <a className="break-words font-medium text-teal-800 underline" href={`/api/documents/open/${document.id}`} target="_blank" rel="noreferrer"><bdi>{document.displayName}</bdi></a>}
        <details className="text-xs text-stone-500"><summary className="cursor-pointer">נתיבי המסמך</summary><dl className="mt-2 space-y-1"><dt>נתיב בתוך Drive</dt><dd dir="ltr" className="break-all">{document.relativePath}</dd>{desktop && localRoot && <><dt>נתיב במחשב זה</dt><dd dir="ltr" className="break-all">{localRoot.replace(/[\\/]+$/, "")}/{document.relativePath}</dd></>}{document.webUrl && <><dt>קישור אינטרנט</dt><dd dir="ltr" className="break-all">{document.webUrl}</dd></>}</dl></details>
        <div className="flex flex-wrap items-center gap-3 text-sm">{desktop && <button type="button" className={buttonClass} disabled={pending} onClick={() => openLocal(document)}>פתח קובץ</button>}<a className="text-teal-700 underline" href={`/api/documents/open/${document.id}`} target="_blank" rel="noreferrer">פתיחה ב-Google Drive</a><button type="button" className="text-xs text-stone-600 underline" disabled={pending} onClick={() => action(async () => { const result = await unlinkDocument({ target, documentId: document.id }); if (!result.ok) throw new Error(result.error); await reload(); setMessage("השיוך הוסר. המסמך והקובץ נשמרו."); })}>הסרת שיוך בלבד</button></div>
      </li>)}</ul>
    </div>}
  </details>;
}
