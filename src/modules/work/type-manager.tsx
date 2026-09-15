"use client";

import { useActionState, useState } from "react";
import * as workActions from "./actions";
import type { WorkFormState } from "./actions";
import { defaultImportantDateTypes, type ImportantDateTypeOption } from "./presentation";

const initialFormState: WorkFormState = {};

export function ImportantDateTypeManager({ options }: { options: readonly ImportantDateTypeOption[] }) {
  const addType = workActions.addImportantDateType ?? (async (state: WorkFormState) => state);
  const removeType = workActions.removeImportantDateType ?? (async () => undefined);
  const [state, action, pending] = useActionState(addType, initialFormState);
  const [color, setColor] = useState(defaultImportantDateTypes[0].color);
  const colors = [
    ["#7c3aed", "סגול"], ["#2563eb", "כחול"], ["#ea580c", "כתום"],
    ["#059669", "ירוק"], ["#db2777", "ורוד"], ["#ca8a04", "זהוב"], ["#475569", "אפור"],
  ] as const;
  return <details className="mt-4 rounded-lg border border-stone-200 p-3">
    <summary className="cursor-pointer text-sm font-medium text-teal-800">ניהול סוגי תאריכים</summary>
    <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto]">
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => <li key={option.key} className="flex items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-sm">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: option.color }} aria-hidden />
          <span>{option.label}</span>
          <form action={async () => { await removeType(option.key); }} onSubmit={(event) => { if (!window.confirm(`להסיר את הסוג ${option.label}?`)) event.preventDefault(); }}>
            <button type="submit" className="ms-1 text-xs text-stone-500 underline hover:text-red-700">הסרה</button>
          </form>
        </li>)}
      </ul>
      <form action={action} className="flex flex-wrap items-end gap-2" noValidate>
        <label className="text-sm">סוג חדש<input name="label" required maxLength={100} className="mt-1 block rounded-lg border border-stone-300 px-2 py-1.5" /></label>
        <fieldset className="text-sm"><legend>צבע</legend><div className="mt-1 flex items-center gap-1.5" role="radiogroup" aria-label="צבע סוג חדש">
          {colors.map(([value, label]) => <label key={value} className="cursor-pointer rounded-full p-1 focus-within:ring-2 focus-within:ring-teal-600" title={label}>
            <input type="radio" name="color" value={value} checked={color === value} onChange={() => setColor(value)} className="sr-only" />
            <span className="block size-6 rounded-full border-2 border-white shadow ring-1 ring-stone-300" style={{ backgroundColor: value }} aria-label={label} />
          </label>)}
        </div></fieldset>
        <button disabled={pending} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "מוסיף…" : "הוסף סוג"}</button>
      </form>
    </div>
    {state.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
    {state.success && <p className="mt-2 text-sm text-teal-800">{state.success}</p>}
  </details>;
}
