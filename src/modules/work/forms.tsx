"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { buttonClass, inputClass } from "@/modules/clients/presentation";
import { saveTask, saveDeadline, saveImportantDate, setTaskDone, type WorkFormState } from "./actions";
import { importantDateTypes } from "./presentation";

const initialState: WorkFormState = {};
export type DeadlineOption = { id: string; label: string };
type FormProps = {
  matterId: string; recordId?: string; initial?: Record<string, string>;
  kind: "task" | "deadline" | "importantDate"; deadlines?: DeadlineOption[];
};

/** The three small forms share feedback and fields but retain distinct actions/models. */
export function WorkForm({ matterId, recordId, initial, kind, deadlines = [] }: FormProps) {
  const save = kind === "task" ? saveTask : kind === "deadline" ? saveDeadline : saveImportantDate;
  const [state, action, pending] = useActionState(save.bind(null, matterId, recordId ?? null), initialState);
  const [createDeadline, setCreateDeadline] = useState(false);
  const [showDeadlineTime, setShowDeadlineTime] = useState(Boolean(initial?.deadlineTime));
  const [showNewDeadlineTime, setShowNewDeadlineTime] = useState(false);
  const value = (field: string) => state.values?.[field] ?? initial?.[field] ?? "";
  const noun = kind === "task" ? "משימה" : kind === "deadline" ? "דדליין" : "תאריך חשוב";
  const typeListId = useId();
  return <form action={action} className="mt-4 space-y-3" noValidate>
    <fieldset disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <legend className="mb-3 font-semibold">{recordId ? `עריכת ${noun}` : kind === "task" ? "משימה חדשה" : `${noun} חדש`}</legend>
      <label className="sm:col-span-2">כותרת (חובה)<input className={inputClass} name="title" required maxLength={300} dir="auto" defaultValue={value("title")} /></label>
      {kind === "task" ? <label className="sm:col-span-2">דדליין (אופציונלי)
        <select className={inputClass} name="deadlineId" disabled={createDeadline} defaultValue={value("deadlineId")}>
          <option value="">ללא דדליין</option>
          {deadlines.map((deadline) => <option key={deadline.id} value={deadline.id}>{deadline.label}</option>)}
        </select>
        <button type="button" className="mt-2 text-sm font-medium text-teal-800 underline disabled:opacity-60" disabled={pending} onClick={() => setCreateDeadline((open) => !open)}>
          {createDeadline ? "בחירת דדליין קיים" : "+ יצירת דדליין חדש"}
        </button>
      </label> : kind === "deadline" ? <DeadlineDateFields
        value={value} showTime={showDeadlineTime} onToggleTime={() => setShowDeadlineTime((shown) => !shown)}
      /> : <label>תאריך ושעה — שעון ישראל (חובה)
        <input className={inputClass} name="eventAt" type="datetime-local" step="1" dir="ltr" required defaultValue={value("eventAt")} />
      </label>}
      {kind === "task" && createDeadline && <>
        <input type="hidden" name="createDeadline" value="true" />
        <label>כותרת דדליין (חובה)<input className={inputClass} name="newDeadlineTitle" required maxLength={300} dir="auto" defaultValue={value("newDeadlineTitle")} /></label>
        <label>תאריך דדליין (חובה)<input className={inputClass} name="newDeadlineDate" type="date" required dir="ltr" defaultValue={value("newDeadlineDate")} /></label>
        <div className="sm:col-span-2">
          <button type="button" className="text-sm font-medium text-teal-800 underline disabled:opacity-60" disabled={pending} onClick={() => setShowNewDeadlineTime((shown) => !shown)}>
            {showNewDeadlineTime ? "הסתרת שעה" : "+ הוספת שעה"}
          </button>
          {showNewDeadlineTime && <label className="mt-2 block">שעה — שעון ישראל (אופציונלי)
            <input className={inputClass} name="newDeadlineTime" type="time" dir="ltr" defaultValue={value("newDeadlineTime")} />
          </label>}
          {!showNewDeadlineTime && <p className="mt-1 text-xs text-stone-500">ללא שעה, הדדליין יוגדר ל־17:00.</p>}
        </div>
      </>}
      {kind === "importantDate" && <label>סוג (אופציונלי)
        <input className={inputClass} name="type" maxLength={100} dir="auto" list={typeListId} defaultValue={value("type")} />
        <datalist id={typeListId}>{Object.entries(importantDateTypes).map(([type, label]) => <option key={type} value={label} />)}</datalist>
      </label>}
      <label className="sm:col-span-2">תיאור (אופציונלי)<textarea className={inputClass} name="description" rows={3} maxLength={10000} dir="auto" defaultValue={value("description")} /></label>
    </fieldset>
    <div aria-live="polite" aria-atomic="true">
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      {state.success && <p className="text-sm text-teal-800">{state.success}</p>}
    </div>
    <button className={buttonClass} disabled={pending}>{pending ? "שומר…" : "שמור"}</button>
  </form>;
}

function DeadlineDateFields({ value, showTime, onToggleTime }: {
  value: (field: string) => string; showTime: boolean; onToggleTime: () => void;
}) {
  return <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2">
    <label>תאריך (חובה)<input className={inputClass} name="deadlineDate" type="date" required dir="ltr" defaultValue={value("deadlineDate")} /></label>
    <div className="self-end">
      <button type="button" className="text-sm font-medium text-teal-800 underline" onClick={onToggleTime}>
        {showTime ? "הסתרת שעה" : "+ הוספת שעה"}
      </button>
      {showTime && <label className="mt-2 block">שעה — שעון ישראל (אופציונלי)
        <input className={inputClass} name="deadlineTime" type="time" dir="ltr" defaultValue={value("deadlineTime")} />
      </label>}
      {!showTime && <p className="mt-1 text-xs text-stone-500">ללא שעה, הדדליין יוגדר ל־17:00.</p>}
    </div>
  </div>;
}

export function TaskCheckbox({ matterId, taskId, done, title }: { matterId: string; taskId: string; done: boolean; title: string }) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(done);
  const [error, setError] = useState<string>();
  const previousDone = useRef(done);
  useEffect(() => {
    if (previousDone.current !== done) {
      previousDone.current = done;
      setChecked(done);
    }
  }, [done]);
  return <div>
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input className="size-5 shrink-0 accent-teal-700" type="checkbox" checked={checked} disabled={pending}
        onChange={(event) => {
          const nextDone = event.currentTarget.checked;
          setError(undefined);
          // Reflect the checkbox click synchronously; the server mutation itself
          // remains in a transition so repeat clicks are disabled while it saves.
          setChecked(nextDone);
          startTransition(async () => {
            try {
              const result = await setTaskDone(matterId, taskId, nextDone);
              if (result.error) { setChecked(done); setError(result.error); }
            } catch { setError("עדכון המשימה נכשל. נסו שוב."); }
          });
        }} />
      <span className={checked ? "min-w-0 break-words text-stone-500 line-through" : "min-w-0 break-words font-semibold"} dir="auto">{title}</span>
      {pending && <span className="shrink-0 text-xs text-stone-500" role="status">שומר…</span>}
    </label>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
  </div>;
}
