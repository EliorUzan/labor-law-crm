"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonClass, inputClass } from "@/modules/clients/presentation";
import { createMatter, updateMatter, saveHistoryEntry, saveMatterNote, type MatterFormState } from "./actions";
import { matterStatusLabels } from "./presentation";
import type { MatterFields, HistoryFields } from "./validation";

const initialState: MatterFormState = {};
type InitialMatter = Omit<MatterFields, "status"> & { status: string | null };

function Feedback({ state }: { state: MatterFormState }) {
  return <div aria-live="polite" aria-atomic="true">
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    {state.success && <p className="text-sm text-teal-800">{state.success}</p>}
  </div>;
}

export function MatterForm({ clientId, matterId, initial, minimal = false }: { clientId: string; matterId?: string; initial?: InitialMatter; minimal?: boolean }) {
  const [state, action, pending] = useActionState(matterId ? updateMatter.bind(null, matterId) : createMatter.bind(null, clientId), initialState);
  const value = (field: keyof MatterFields) => state.values?.[field] ?? initial?.[field] ?? "";
  const textField = (field: keyof MatterFields, label: string, max: number, type = "text") => <label>{label}
    <input className={inputClass} name={field} defaultValue={value(field)} maxLength={max} type={type} dir={type === "tel" || type === "email" ? "ltr" : "auto"} />
  </label>;
  const status = value("status");
  return <form action={action} className="space-y-5" noValidate>
    <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">כותרת (חובה)<input className={inputClass} name="title" required maxLength={300} defaultValue={value("title")} dir="auto" /></label>
      {!minimal && <>{textField("caseType", "סוג תיק", 200)}
      <label>סטטוס<select className={inputClass} name="status" defaultValue={status}>
        <option value="">ללא סטטוס</option>
        {status && !Object.hasOwn(matterStatusLabels, status) && <option value={status} disabled>{status} — יש לבחור סטטוס</option>}
        {Object.entries(matterStatusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select></label>
      <label>תאריך פתיחה<input className={inputClass} type="date" name="openDate" defaultValue={value("openDate")} dir="ltr" /></label>
      {textField("caseNumber", "מספר תיק", 200)}
      {textField("courtOrTribunal", "בית דין / ערכאה", 300)}
      {textField("opposingParty", "צד שכנגד", 500)}</>}
    </fieldset>
    {!minimal && <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <legend className="mb-3 font-semibold">עורך דין בצד שכנגד</legend>
      {textField("opposingAttorneyName", "שם", 200)}
      {textField("opposingAttorneyPhone", "טלפון", 50, "tel")}
      {textField("opposingAttorneyEmail", "דוא״ל", 254, "email")}
      {textField("opposingAttorneyFirm", "משרד", 300)}
    </fieldset>}
    <Feedback state={state} />
    <div className="flex items-center gap-4"><button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור"}</button>
      <Link className="text-sm text-stone-600 underline" href={matterId ? `/matters/${matterId}` : `/clients/${clientId}`}>ביטול</Link></div>
  </form>;
}

export function MatterNoteForm({ matterId, noteId, initial }: { matterId: string; noteId?: string; initial?: string }) {
  const [state, action, pending] = useActionState(saveMatterNote.bind(null, matterId, noteId ?? null), initialState);
  const content = state.values?.content ?? initial ?? "";
  return <form action={action} className="mt-4 space-y-3" noValidate>
    <fieldset disabled={pending}>
      <label className="block">הערה<textarea className={inputClass} name="content" required rows={3} maxLength={10000} dir="auto" defaultValue={content} /></label>
    </fieldset>
    <Feedback state={state} />
    <button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור"}</button>
  </form>;
}

export function HistoryForm({ matterId, entryId, initial, today }: { matterId: string; entryId?: string; initial?: HistoryFields; today: string }) {
  const [state, action, pending] = useActionState(saveHistoryEntry.bind(null, matterId, entryId ?? null), initialState);
  const value = (field: keyof HistoryFields) => state.values?.[field] ?? initial?.[field] ?? (field === "eventDate" ? today : "");
  return <form action={action} className="mt-4 space-y-3" noValidate>
    <fieldset disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <legend className="mb-3 font-semibold">{entryId ? "עריכת אירוע" : "אירוע חדש"}</legend>
      <label>תאריך (חובה)<input className={inputClass} name="eventDate" type="date" dir="ltr" required defaultValue={value("eventDate")} /></label>
      <label>כותרת (חובה)<input className={inputClass} name="title" required maxLength={300} dir="auto" defaultValue={value("title")} /></label>
      <label className="sm:col-span-2">תיאור<textarea className={inputClass} name="description" rows={3} maxLength={10000} dir="auto" defaultValue={value("description")} /></label>
    </fieldset>
    <Feedback state={state} />
    <button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור"}</button>
  </form>;
}
