"use client";

import Link from "next/link";
import { startTransition, useActionState, useId, useState } from "react";
import { createClient, updateClient, addFinancialRecord, addObligation, updateObligation, setObligationCompletion, type ClientFormState } from "./actions";
import { buttonClass, inputClass, clientStatusLabels, financialTypeLabels } from "./presentation";

type ClientFields = { name: string; phone: string | null; email: string | null; address: string | null; notes: string | null; status: keyof typeof clientStatusLabels | null };
type MatterOption = { id: string; title: string };
const initialState: ClientFormState = {};

function Feedback({ state }: { state: ClientFormState }) {
  return <div aria-live="polite" aria-atomic="true">
    {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{state.error}</p>}
    {state.success && <p className="text-sm text-teal-800">{state.success}</p>}
  </div>;
}

export function ClientForm({ clientId, initial }: { clientId?: string; initial?: ClientFields }) {
  const [state, action, pending] = useActionState(clientId ? updateClient.bind(null, clientId) : createClient, initialState);
  const value = (field: keyof ClientFields) => state.values?.[field] ?? initial?.[field] ?? (field === "status" && !initial ? "active" : "");
  return <form action={action} className="space-y-4" noValidate>
    <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">שם <span className="text-sm text-stone-500">(חובה)</span>
        <input className={inputClass} name="name" defaultValue={value("name")} required maxLength={200} autoComplete="name" dir="auto" />
      </label>
      <label>טלפון<input className={inputClass} name="phone" type="tel" dir="ltr" defaultValue={value("phone")} maxLength={50} autoComplete="tel" /></label>
      <label>דוא״ל<input className={inputClass} name="email" type="email" dir="ltr" defaultValue={value("email")} maxLength={254} autoComplete="email" /></label>
      <label>כתובת<input className={inputClass} name="address" defaultValue={value("address")} maxLength={1000} autoComplete="street-address" dir="auto" /></label>
      <label>סטטוס<select className={inputClass} name="status" defaultValue={value("status")}>
        <option value="">ללא סטטוס</option>
        {Object.entries(clientStatusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select></label>
      <label className="sm:col-span-2">הערות<textarea className={inputClass} name="notes" defaultValue={value("notes")} rows={3} maxLength={10000} dir="auto" /></label>
    </fieldset>
    <Feedback state={state} />
    <div className="flex items-center gap-4"><button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור"}</button>
      <Link className="text-sm text-stone-600 underline" href={clientId ? `/clients/${clientId}` : "/clients"}>ביטול</Link></div>
  </form>;
}

function MatterSelect({ matters, value }: { matters: MatterOption[]; value?: string }) {
  if (!matters.length) return null;
  return <label>תיק (אופציונלי)<select name="matterId" className={inputClass} defaultValue={value ?? ""}>
    <option value="">ללא שיוך לתיק</option>
    {matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.title}</option>)}
  </select></label>;
}

export function FinancialRecordForm({ clientId, matters, today }: { clientId: string; matters: MatterOption[]; today: string }) {
  const [state, action, pending] = useActionState(addFinancialRecord.bind(null, clientId), initialState);
  return <form action={action} className="mt-4 space-y-3" noValidate>
    <fieldset disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label>סוג<select className={inputClass} name="type" defaultValue={state.values?.type ?? "charge"}>
        {Object.entries(financialTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>סכום (₪)<input className={inputClass} name="amount" inputMode="decimal" dir="ltr" required defaultValue={state.values?.amount ?? ""} maxLength={15} /></label>
      <label>תאריך<input className={inputClass} name="recordDate" type="date" required dir="ltr" defaultValue={state.values?.recordDate ?? today} /></label>
      <MatterSelect matters={matters} value={state.values?.matterId} />
      <label className="sm:col-span-2">הערה (אופציונלי)<textarea className={inputClass} name="description" rows={2} maxLength={10000} dir="auto" defaultValue={state.values?.description ?? ""} /></label>
    </fieldset>
    <Feedback state={state} />
    <button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור רשומה"}</button>
  </form>;
}

export function ObligationForm({ clientId, matters, deadlines = [], obligationId, initial }: {
  clientId: string; matters: MatterOption[]; deadlines?: { id: string; matterId: string; label: string }[];
  obligationId?: string; initial?: { title: string; description: string | null; matterId: string | null; deadlineId: string | null; dueDate: string | null };
}) {
  const [matterId, setMatterId] = useState(initial?.matterId ?? "");
  const [deadlineId, setDeadlineId] = useState(initial?.deadlineId ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [createDeadline, setCreateDeadline] = useState(false);
  const [newDeadlineMatterId, setNewDeadlineMatterId] = useState(initial?.matterId ?? "");
  const [showNewDeadlineTime, setShowNewDeadlineTime] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const save = obligationId ? updateObligation.bind(null, clientId, obligationId) : addObligation.bind(null, clientId);
  const [state, action, pending] = useActionState(async (previous: ClientFormState, formData: FormData) => {
    const result = await save(previous, formData);
    if (result.success && !obligationId) { setMatterId(""); setDeadlineId(""); setDueDate(""); setFormVersion((version) => version + 1); }
    return result;
  }, initialState);
  // Dispatch explicitly: dependent selectors must survive a returned validation
  // error. Reset a new form only after the server confirms a successful save.
  return <form method="post" onSubmit={(event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }} className="mt-4 space-y-3" noValidate>
    <fieldset key={formVersion} disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <legend className="mb-3 font-semibold">{obligationId ? "עריכת התחייבות" : "התחייבות חדשה"}</legend>
      <label className="sm:col-span-2">כותרת (חובה)<input className={inputClass} name="title" required maxLength={300} dir="auto" defaultValue={state.values?.title ?? initial?.title ?? ""} /></label>
      {matters.length > 0 && <label>תיק (אופציונלי)<select name="matterId" className={inputClass} value={matterId}
        onChange={(event) => { setMatterId(event.target.value); setDeadlineId(""); }}>
        <option value="">ללא תיק</option>
        {matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.title}</option>)}
      </select></label>}
      <label>דדליין (אופציונלי)<select name="deadlineId" className={inputClass} disabled={createDeadline} value={deadlineId}
        onChange={(event) => { setDeadlineId(event.target.value); if (event.target.value) setDueDate(""); }}>
        <option value="">ללא דדליין</option>
        {deadlines.filter((deadline) => !matterId || deadline.matterId === matterId).map((deadline) => <option key={deadline.id} value={deadline.id}>{deadline.label}</option>)}
      </select></label>
      <div className="sm:col-span-2">
        <button type="button" className="text-sm font-medium text-teal-800 underline" onClick={() => {
          setCreateDeadline((open) => !open); setDueDate("");
        }}>
          {createDeadline ? "בחירת דדליין קיים" : "+ יצירת דדליין חדש"}
        </button>
      </div>
      {createDeadline && <>
        <input type="hidden" name="createDeadline" value="true" />
        <label>תיק לדדליין (חובה)<select name="newDeadlineMatterId" className={inputClass} required value={newDeadlineMatterId}
          onChange={(event) => setNewDeadlineMatterId(event.target.value)}>
          <option value="">בחירת תיק</option>
          {matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.title}</option>)}
        </select></label>
        <label>כותרת דדליין (חובה)<input className={inputClass} name="newDeadlineTitle" required maxLength={300} dir="auto" defaultValue={state.values?.newDeadlineTitle ?? ""} /></label>
        <label>תאריך דדליין (חובה)<input className={inputClass} name="newDeadlineDate" type="date" required dir="ltr" defaultValue={state.values?.newDeadlineDate ?? ""} /></label>
        <div className="self-end">
          <button type="button" className="text-sm font-medium text-teal-800 underline" onClick={() => setShowNewDeadlineTime((shown) => !shown)}>
            {showNewDeadlineTime ? "הסתרת שעה" : "+ הוספת שעה"}
          </button>
          {showNewDeadlineTime && <label className="mt-2 block">שעה — שעון ישראל (אופציונלי)
            <input className={inputClass} name="newDeadlineTime" type="time" dir="ltr" defaultValue={state.values?.newDeadlineTime ?? ""} />
          </label>}
          {!showNewDeadlineTime && <p className="mt-1 text-xs text-stone-500">ללא שעה, הדדליין יוגדר ל־17:00.</p>}
        </div>
      </>}
      {!deadlineId && !createDeadline && <label>תאריך יעד (אופציונלי)<input className={inputClass} name="dueDate" type="date" dir="ltr" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>}
      <p className="text-xs text-stone-500 sm:col-span-2">בחירת דדליין מחליפה את תאריך היעד העצמאי. התאריך יוצג מתוך הדדליין ויתעדכן יחד איתו.</p>
      <label className="sm:col-span-2">תיאור (אופציונלי)<textarea className={inputClass} name="description" rows={2} maxLength={10000} dir="auto" defaultValue={state.values?.description ?? initial?.description ?? ""} /></label>
    </fieldset>
    <Feedback state={state} />
    <button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור התחייבות"}</button>
  </form>;
}

export function ObligationCompletion({ clientId, obligationId, title, done }: { clientId: string; obligationId: string; title: string; done: boolean }) {
  const [state, action, pending] = useActionState(setObligationCompletion.bind(null, clientId, obligationId), initialState);
  const id = useId();
  return <form action={action}>
    <input type="hidden" name="done" value={done ? "false" : "true"} />
    <div className="flex items-start gap-2">
      <input id={id} type="checkbox" checked={done} disabled={pending} className="mt-1 size-4 shrink-0 accent-teal-700" aria-label={`${done ? "פתיחה מחדש" : "סימון כהושלמה"}: ${title}`}
        onChange={(event) => event.currentTarget.form?.requestSubmit()} />
      <label htmlFor={id} className={`min-w-0 break-words font-medium ${done ? "text-stone-500 line-through" : "text-stone-900"}`}>{title}</label>
      {pending && <span className="text-xs text-stone-500" role="status">מעדכן…</span>}
    </div>
    <noscript><button className="text-sm underline">{done ? "פתיחה מחדש" : "סימון כהושלמה"}</button></noscript>
    <Feedback state={state} />
  </form>;
}
