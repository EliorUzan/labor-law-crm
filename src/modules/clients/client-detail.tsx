import Link from "next/link";
import { formatIsraeliDate, formatIsraeliShekels } from "@/modules/dashboard/format";
import { FinancialRecordForm, ObligationForm, ObligationCompletion } from "./forms";
import { clientStatusLabels, financialTypeLabels, panelClass, buttonClass } from "./presentation";
import type { ClientDetail } from "./queries";
import { matterStatusLabel } from "@/modules/matters/presentation";

export function ClientDetailView({ data, today }: { data: ClientDetail; today: string }) {
  const { client, matters, records, obligations, financialSummary } = data;
  const open = obligations.filter((obligation) => !obligation.done);
  const completed = obligations.filter((obligation) => obligation.done);
  const matterNames = new Map(matters.map((matter) => [matter.id, matter.title]));
  const contactFields = [
    { label: "טלפון", value: client.phone, ltr: true },
    { label: "דוא״ל", value: client.email, ltr: true },
    { label: "כתובת", value: client.address },
    { label: "סטטוס", value: client.status ? clientStatusLabels[client.status] : null },
    { label: "הערות", value: client.notes },
  ].filter((field) => field.value);
  const obligationList = (items: typeof obligations) => <ul className="divide-y divide-stone-100">{items.map((obligation) => <li className="py-3" key={obligation.id}>
    <ObligationCompletion clientId={client.id} obligationId={obligation.id} title={obligation.title} done={obligation.done} />
    {obligation.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-600" dir="auto">{obligation.description}</p>}
    {(obligation.dueDate || obligation.matterId) && <p className="mt-1 text-sm text-stone-500">
      {obligation.dueDate && <span className={!obligation.done && obligation.dueDate < today ? "text-red-700" : ""}>עד {formatIsraeliDate(obligation.dueDate)}{!obligation.done && obligation.dueDate < today ? " · באיחור" : ""}</span>}
      {obligation.matterId && <span className="ms-2">{matterNames.get(obligation.matterId)}</span>}
    </p>}
  </li>)}</ul>;

  return <div className="space-y-5">
    <Link className="text-sm text-teal-700 underline" href="/clients">לקוחות</Link>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="min-w-0 break-words text-3xl font-bold">{client.name}</h1>
      <Link className={buttonClass} href={`/clients/${client.id}/edit`}>עריכה</Link>
    </header>
    {contactFields.length > 0 && <section className={panelClass}>
      <h2 className="text-lg font-bold">פרטי לקוח</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">{contactFields.map((field) => <div key={field.label} className={field.label === "הערות" ? "sm:col-span-2" : ""}>
        <dt className="text-sm text-stone-500">{field.label}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words"><bdi dir={field.ltr ? "ltr" : "auto"}>{field.value}</bdi></dd>
      </div>)}</dl>
    </section>}

    <section className={panelClass} id="finances">
      <h2 className="text-lg font-bold">כספים</h2>
      <dl className="mt-3 grid gap-4 sm:grid-cols-3">
        {[
          ["סה״כ חיובים", financialSummary.totalCharges],
          ["סה״כ שולם", financialSummary.totalPayments],
          [financialSummary.outstandingAmount.startsWith("-") ? "יתרת זכות" : "יתרה לתשלום", financialSummary.outstandingAmount],
        ].map(([label, amount], index) => <div key={label} className={index === 2 ? "rounded-lg bg-teal-50 p-3" : "p-3"}>
          <dt className="text-sm text-stone-600">{label}</dt><dd className="mt-1 break-words text-xl font-bold"><bdi dir="ltr">{formatIsraeliShekels(amount)}</bdi></dd>
        </div>)}
      </dl>
      <details className="mt-4 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף רשומה</summary>
        <FinancialRecordForm clientId={client.id} matters={matters} today={today} />
      </details>
      <h3 className="mt-5 font-semibold">היסטוריה כספית</h3>
      {records.length ? <ul className="mt-2 divide-y divide-stone-100">{records.map((record) => <li key={record.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
        <div className="min-w-0 flex-1"><p className="font-medium">{financialTypeLabels[record.type]} <span className="ms-2 text-sm font-normal text-stone-500">{formatIsraeliDate(record.recordDate)}</span></p>
          {record.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-600" dir="auto">{record.description}</p>}
          {record.matterId && <p className="mt-1 text-sm text-stone-500">{matterNames.get(record.matterId)}</p>}
        </div><bdi className="font-semibold" dir="ltr">{formatIsraeliShekels(record.amount)}</bdi>
      </li>)}</ul> : <p className="mt-2 text-sm text-stone-500">אין רשומות כספיות ללקוח זה.</p>}
    </section>

    <section className={panelClass} id="obligations">
      <h2 className="text-lg font-bold">התחייבויות פתוחות <span className="text-sm font-normal text-stone-500">({open.length})</span></h2>
      {open.length ? obligationList(open) : <p className="mt-3 text-sm text-stone-500">אין התחייבויות פתוחות ללקוח זה.</p>}
      <details className="mt-4 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף התחייבות</summary>
        <ObligationForm clientId={client.id} matters={matters} />
      </details>
      {completed.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm text-stone-500">התחייבויות שהושלמו ({completed.length})</summary>{obligationList(completed)}</details>}
    </section>

    <section className={panelClass}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">תיקים <span className="text-sm font-normal text-stone-500">({matters.length})</span></h2>
        <Link className={buttonClass} href={`/clients/${client.id}/matters/new`}>+ תיק חדש</Link></div>
      {matters.length ? <ul className="mt-2 divide-y divide-stone-100">{matters.map((matter) => <li key={matter.id} className="py-3">
        <Link className="break-words font-medium text-teal-800 hover:underline" href={`/matters/${matter.id}`}><bdi>{matter.title}</bdi></Link>
        {(matter.status || matter.caseNumber) && <p className="mt-1 text-sm text-stone-500">{matterStatusLabel(matter.status)}{matter.caseNumber && <bdi className="ms-2">{matter.caseNumber}</bdi>}</p>}
      </li>)}</ul> : <p className="mt-3 text-sm text-stone-500">אין תיקים ללקוח זה</p>}
    </section>
  </div>;
}
