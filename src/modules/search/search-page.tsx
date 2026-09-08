import Link from "next/link";

import { inputClass, panelClass } from "@/modules/clients/presentation";
import type { SearchResults } from "./queries";

function ResultGroup({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return <section className={panelClass}><h2 className="text-lg font-bold">{title}</h2><ul className="mt-3 divide-y divide-stone-100">{children}</ul></section>;
}

function ResultLink({ href, title, detail }: Readonly<{ href: string; title: string; detail?: React.ReactNode }>) {
  return <li><Link className="block rounded-lg px-2 py-3 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-teal-700" href={href}>
    <p className="break-words font-semibold" dir="auto">{title}</p>{detail && <p className="mt-1 break-words text-sm text-stone-600" dir="auto">{detail}</p>}
  </Link></li>;
}

export function SearchPageContent({ query, results }: Readonly<{ query: string; results: SearchResults }>) {
  const count = results.clients.length + results.matters.length + results.history.length + results.notes.length;
  return <div className="mx-auto max-w-4xl space-y-5">
    <header><h1 className="text-3xl font-bold">חיפוש</h1><p className="mt-1 text-sm text-stone-600">לקוחות, תיקים, היסטוריית תיק והערות.</p></header>
    <form action="/search" className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1">חיפוש<input autoFocus className={inputClass} defaultValue={query} dir="auto" maxLength={200} name="q" placeholder="שם, טלפון, מספר תיק או תוכן" type="search" /></label>
      <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800">חיפוש</button>
    </form>
    {!query ? <p className="text-sm text-stone-500">הקלידו כדי לחפש בכל הרשומות המרכזיות.</p> : count === 0 ? <div className={panelClass}><p className="font-medium">לא נמצאו תוצאות</p><p className="mt-1 text-sm text-stone-500">אפשר לנסות מילה אחרת או חלק מהמספר.</p></div> : <div className="space-y-4">
      <p className="text-sm text-stone-600">תוצאות עבור <bdi className="font-medium">{query}</bdi></p>
      {results.clients.length > 0 && <ResultGroup title="לקוחות">{results.clients.map((client) => <ResultLink key={client.id} href={`/clients/${client.id}`} title={client.name} detail={client.phone || client.email ? <span className="flex flex-wrap gap-x-3 gap-y-1">{client.phone && <bdi dir="ltr">{client.phone}</bdi>}{client.email && <bdi dir="ltr">{client.email}</bdi>}</span> : undefined} />)}</ResultGroup>}
      {results.matters.length > 0 && <ResultGroup title="תיקים">{results.matters.map((matter) => <ResultLink key={matter.id} href={`/matters/${matter.id}`} title={matter.title} detail={[matter.clientName, matter.caseNumber].filter(Boolean).join(" · ")} />)}</ResultGroup>}
      {results.history.length > 0 && <ResultGroup title="היסטוריית תיק">{results.history.map((entry) => <ResultLink key={entry.id} href={`/matters/${entry.matterId}#history`} title={entry.title} detail={`${entry.matterTitle} · ${entry.clientName}`} />)}</ResultGroup>}
      {results.notes.length > 0 && <ResultGroup title="הערות">{results.notes.map((note) => <ResultLink key={note.id} href={`/matters/${note.matterId}#notes`} title={note.content} detail={`${note.matterTitle} · ${note.clientName}`} />)}</ResultGroup>}
    </div>}
  </div>;
}
