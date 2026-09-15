"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { deleteDeadline, deleteImportantDate, saveDashboardImportantDate, type WorkFormState } from "@/modules/work/actions";
import { importantDateTypeLabel, type ImportantDateTypeOption } from "@/modules/work/presentation";
import { ImportantDateTypeManager } from "@/modules/work/type-manager";
import { formatIsraeliDateTime } from "@/modules/dashboard/format";
import { toJerusalemDate } from "@/modules/work/time";

export type CalendarEvent = {
  id: string; kind: "importantDate" | "deadline"; clientId: string; matterId: string; title: string;
  matterTitle: string; clientName: string; eventAt: Date; description: string | null; type: string | null;
};

type MatterOption = { id: string; title: string; clientName: string };
type Month = { year: number; month: number };
const weekdays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const initialFormState: WorkFormState = {};

function monthFromDate(value: Date): Month {
  const [year, month] = toJerusalemDate(value).split("-").map(Number);
  return { year, month };
}

function shiftMonth(month: Month, amount: number): Month {
  const date = new Date(Date.UTC(month.year, month.month - 1 + amount, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function eventTypeLabel(event: CalendarEvent, options: readonly ImportantDateTypeOption[]): string {
  return options.find((option) => option.key === event.type)?.label
    ?? importantDateTypeLabel(event.type)
    ?? (event.kind === "deadline" ? "דדליין" : "תאריך חשוב");
}

function EventTooltip({ event, options }: { event: CalendarEvent; options: readonly ImportantDateTypeOption[] }) {
  const remove = event.kind === "deadline" ? deleteDeadline : deleteImportantDate;
  return <div className="group relative min-w-0">
    <button type="button" className="block w-full truncate rounded px-1.5 py-1 text-right text-xs font-medium text-white shadow-sm" style={{ backgroundColor: options.find((option) => option.key === event.type)?.color ?? "#64748b" }} title={`${event.title} · ${event.matterTitle} · ${event.clientName}${event.description ? ` · ${event.description}` : ""}`}>
      <bdi>{event.title}</bdi>
    </button>
    <div className="pointer-events-none invisible absolute bottom-full right-0 z-20 w-64 rounded-lg border border-stone-200 bg-stone-900 p-3 text-right text-xs text-white opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100" role="tooltip">
      <p className="font-semibold"><bdi>{event.title}</bdi></p>
      <p className="mt-1 text-stone-300">{eventTypeLabel(event, options)} · {formatIsraeliDateTime(event.eventAt)}</p>
      <p><a className="underline" href={`/clients/${event.clientId}`}><bdi>{event.clientName}</bdi></a> <span aria-hidden="true">|</span> <a className="underline" href={`/matters/${event.matterId}`}><bdi>{event.matterTitle}</bdi></a></p>
      {event.description && <p className="mt-1 whitespace-pre-wrap text-stone-300"><bdi>{event.description}</bdi></p>}
      <form className="mt-2" action={async (formData) => { await remove(event.matterId, event.id, formData); }} onSubmit={(submitEvent) => { if (!window.confirm("למחוק את האירוע?")) submitEvent.preventDefault(); }}>
        <button type="submit" className="text-red-300 underline hover:text-red-100">מחיקה</button>
      </form>
    </div>
  </div>;
}

function AddCalendarEvent({ matters, options }: { matters: readonly MatterOption[]; options: readonly ImportantDateTypeOption[] }) {
  const [state, action, pending] = useActionState(saveDashboardImportantDate, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) formRef.current?.reset(); }, [state.success]);
  return <details className="mt-4 rounded-lg border border-teal-100 bg-teal-50/40 p-3">
    <summary className="cursor-pointer font-medium text-teal-800">+ הוסף אירוע ללוח השנה</summary>
    <form ref={formRef} action={action} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
      <label>תיק<select className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" name="matterId" required defaultValue=""><option value="" disabled>בחירת תיק</option>{matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.title} · {matter.clientName}</option>)}</select></label>
      <label>סוג<select className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" name="type" required defaultValue={options[0]?.key ?? ""}>{options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
      <label>כותרת<input className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" name="title" required maxLength={300} dir="auto" /></label>
      <label>תאריך ושעה — שעון ישראל<input className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" name="eventAt" type="datetime-local" required step="1" dir="ltr" /></label>
      <label className="sm:col-span-2">תיאור<input className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" name="description" maxLength={10000} dir="auto" /></label>
      {state.error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="sm:col-span-2 text-sm text-teal-800">{state.success}</p>}
      <button disabled={pending} className="w-fit rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "שומר…" : "שמור אירוע"}</button>
    </form>
  </details>;
}

export function SmartCalendar({ events, matters, options, initialDate }: { events: readonly CalendarEvent[]; matters: readonly MatterOption[]; options: readonly ImportantDateTypeOption[]; initialDate: Date }) {
  const [month, setMonth] = useState(() => monthFromDate(initialDate));
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = toJerusalemDate(event.eventAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
  return <section className="rounded-xl border border-teal-200 bg-white p-5 sm:p-6" aria-labelledby="smart-calendar-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="smart-calendar-title" className="text-xl font-bold text-stone-900">לוח שנה חכם</h2><p className="mt-1 text-sm text-stone-500">תאריכים חשובים ודדליינים מכל התיקים</p></div>
      <div className="flex items-center gap-2"><button type="button" className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm" onClick={() => setMonth((current) => shiftMonth(current, -1))} aria-label="חודש קודם">‹</button><span className="min-w-32 text-center font-semibold">{monthLabel}</span><button type="button" className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm" onClick={() => setMonth((current) => shiftMonth(current, 1))} aria-label="חודש הבא">›</button></div>
    </div>
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">{options.map((option) => <span key={option.key} className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ backgroundColor: option.color }} aria-hidden />{option.label}</span>)}</div>
    <ImportantDateTypeManager options={options} />
    <AddCalendarEvent matters={matters} options={options} />
    <div className="mt-5 overflow-x-auto">
      <div className="grid min-w-[42rem] grid-cols-7 overflow-visible rounded-lg border border-stone-200" dir="rtl">
        {weekdays.map((day) => <div key={day} className="border-b border-stone-200 bg-stone-50 px-2 py-2 text-center text-xs font-semibold text-stone-500">{day}</div>)}
        {cells.map((day, index) => {
          const dateKey = day ? `${month.year}-${String(month.month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : `empty-${index}`;
          const dayEvents = day ? eventsByDate.get(dateKey) ?? [] : [];
          return <div key={dateKey} className={`min-h-28 border-b border-s border-stone-200 p-1.5 ${day ? "bg-white" : "bg-stone-50/60"}`}>
            {day && <><p className="text-xs font-semibold text-stone-500">{day}</p><div className="mt-1 space-y-1">{dayEvents.map((event) => <EventTooltip key={`${event.kind}-${event.id}`} event={event} options={options} />)}</div></>}
          </div>;
        })}
      </div>
    </div>
  </section>;
}
