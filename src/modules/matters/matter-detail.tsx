import Link from "next/link";
import type { ReactNode } from "react";
import { panelClass, buttonClass } from "@/modules/clients/presentation";
import { formatIsraeliDate, formatIsraeliDateTime } from "@/modules/dashboard/format";
import { HistoryForm, MatterNoteForm } from "./forms";
import { matterStatusLabel } from "./presentation";
import type { MatterDetail } from "./queries";

export function MatterDetailView({ data, today, work }: { data: MatterDetail; today: string; work?: ReactNode }) {
  const { matter, client, history, notes } = data;
  const details = [
    { label: "סטטוס", value: matterStatusLabel(matter.status) },
    { label: "סוג תיק", value: matter.caseType },
    { label: "תאריך פתיחה", value: matter.openDate && formatIsraeliDate(matter.openDate), ltr: true },
    { label: "מספר תיק", value: matter.caseNumber },
    { label: "בית דין / ערכאה", value: matter.courtOrTribunal },
    { label: "צד שכנגד", value: matter.opposingParty },
  ];
  const attorney = [
    { label: "שם", value: matter.opposingAttorneyName },
    { label: "טלפון", value: matter.opposingAttorneyPhone, ltr: true },
    { label: "דוא״ל", value: matter.opposingAttorneyEmail, ltr: true },
    { label: "משרד", value: matter.opposingAttorneyFirm },
  ];
  const fields = (title: string, items: typeof details) => {
    const visible = items.filter((field) => field.value?.trim());
    return visible.length > 0 && <section className={panelClass}>
      <h2 className="text-lg font-bold">{title}</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">{visible.map((field) => <div key={field.label} className="min-w-0">
        <dt className="text-sm text-stone-500">{field.label}</dt>
        <dd className="mt-0.5 whitespace-pre-wrap break-words"><bdi dir={field.ltr ? "ltr" : "auto"}>{field.value}</bdi></dd>
      </div>)}</dl>
    </section>;
  };
  return <div className="space-y-5">
    <Link className="text-sm text-teal-700 underline" href={`/clients/${client.id}`}><bdi>{client.name}</bdi></Link>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="min-w-0 break-words text-3xl font-bold" dir="auto">{matter.title}</h1>
      <Link className={buttonClass} href={`/matters/${matter.id}/edit`}>עריכה</Link>
    </header>
    {fields("פרטי תיק", details)}
    {fields("עורך דין בצד שכנגד", attorney)}
    {work}
    <section className={panelClass} id="notes">
      <h2 className="text-lg font-bold">הערות</h2>
      <details className="mt-4 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף הערה</summary>
        <MatterNoteForm matterId={matter.id} />
      </details>
      {notes.length ? <ol className="mt-4 divide-y divide-stone-100">{notes.map((note) => <li key={note.id} className="py-4">
        <time dateTime={note.createdAt.toISOString()} className="text-sm font-medium text-teal-800" dir="ltr">{formatIsraeliDateTime(note.createdAt)}</time>
        <p className="mt-2 whitespace-pre-wrap break-words" dir="auto">{note.content}</p>
        <details className="mt-3"><summary className="cursor-pointer text-sm text-teal-700">עריכת הערה</summary>
          <MatterNoteForm matterId={matter.id} noteId={note.id} initial={note.content} />
        </details>
      </li>)}</ol> : <p className="mt-4 text-sm text-stone-500">אין הערות לתיק זה.</p>}
    </section>
    <section className={panelClass} id="history">
      <h2 className="text-lg font-bold">היסטוריית תיק</h2>
      <details className="mt-4 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף אירוע להיסטוריה</summary>
        <HistoryForm matterId={matter.id} today={today} />
      </details>
      {history.length ? <ol className="mt-4 divide-y divide-stone-100">{history.map((entry) => <li key={entry.id} className="py-4">
        <time dateTime={entry.eventDate} className="text-sm font-medium text-teal-800" dir="ltr">{formatIsraeliDate(entry.eventDate)}</time>
        <h3 className="mt-1 break-words font-semibold" dir="auto">{entry.title}</h3>
        {entry.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-600" dir="auto">{entry.description}</p>}
        <details className="mt-3"><summary className="cursor-pointer text-sm text-teal-700">עריכת אירוע</summary>
          <HistoryForm key={`${entry.eventDate}-${entry.title}-${entry.description}`} matterId={matter.id} entryId={entry.id} initial={entry} today={today} />
        </details>
      </li>)}</ol> : <p className="mt-4 text-sm text-stone-500">אין אירועים בהיסטוריית התיק.</p>}
    </section>
  </div>;
}
