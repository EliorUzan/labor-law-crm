"use client";

import { useActionState } from "react";
import { buttonClass, inputClass } from "@/modules/clients/presentation";
import { saveDocumentReference, type DocumentFormState } from "./actions";
import type { DocumentReferenceFields } from "./validation";

const initialState: DocumentFormState = {};

function Feedback({ state }: { state: DocumentFormState }) {
  return <div aria-live="polite" aria-atomic="true">
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    {state.success && <p className="text-sm text-teal-800">{state.success}</p>}
  </div>;
}

export function DocumentReferenceForm({ matterId, documentId, initial }: { matterId: string; documentId?: string; initial?: DocumentReferenceFields }) {
  const [state, action, pending] = useActionState(saveDocumentReference.bind(null, matterId, documentId ?? null), initialState);
  const value = (field: keyof DocumentReferenceFields) => state.values?.[field] ?? initial?.[field] ?? "";
  const providerValue = value("provider");
  const knownProviders = ["google_drive", "dropbox", "onedrive", "local", "other"];

  return <form action={action} className="mt-4 space-y-3" noValidate>
    <fieldset disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <legend className="mb-3 font-semibold">{documentId ? "עריכת מסמך" : "מסמך חדש"}</legend>
      <label>שם (חובה)<input className={inputClass} name="displayName" required maxLength={300} defaultValue={value("displayName")} dir="auto" /></label>
      <label>מיקום / קישור (חובה)<input className={inputClass} name="location" required maxLength={2048} defaultValue={value("location")} dir="ltr" /></label>
      <label>סוג / קטגוריה<input className={inputClass} name="category" maxLength={100} defaultValue={value("category")} dir="auto" /></label>
      <label>ספק<select className={inputClass} name="provider" defaultValue={providerValue}>
        <option value="">ללא בחירה</option>
        {typeof providerValue === "string" && providerValue && !knownProviders.includes(providerValue) && <option value={providerValue}>{providerValue}</option>}
        <option value="google_drive">Google Drive</option><option value="dropbox">Dropbox</option><option value="onedrive">OneDrive</option><option value="local">מקומי</option><option value="other">אחר</option>
      </select></label>
      <label className="sm:col-span-2">הערות<textarea className={inputClass} name="notes" rows={3} maxLength={10000} defaultValue={value("notes")} dir="auto" /></label>
    </fieldset>
    <Feedback state={state} />
    <button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור"}</button>
  </form>;
}
