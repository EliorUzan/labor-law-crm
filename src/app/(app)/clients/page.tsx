import Link from "next/link";
import { z } from "zod";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { listClients } from "@/modules/clients/queries";
import { buttonClass, inputClass, panelClass, clientStatusLabels } from "@/modules/clients/presentation";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const query = z.string().trim().max(200).catch("").parse((await searchParams).q);
  const clients = await listClients(ownerUserId, query);
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">לקוחות</h1><Link className={buttonClass} href="/clients/new">+ לקוח חדש</Link>
    </header>
    <form action="/clients" className="flex flex-wrap items-end gap-2">
      <label className="w-full sm:max-w-sm">חיפוש לפי שם<input className={inputClass} name="q" defaultValue={query} maxLength={200} dir="auto" type="search" /></label>
      <button className={buttonClass}>חיפוש</button>
      {query && <Link className="px-2 py-2 text-sm text-teal-700 underline" href="/clients">ניקוי</Link>}
    </form>
    <div className={panelClass}>
      {clients.length ? <ul className="divide-y divide-stone-100">{clients.map((client) => <li key={client.id}>
        <Link className="block rounded-lg px-2 py-3 hover:bg-stone-50 focus-visible:outline-teal-700" href={`/clients/${client.id}`}>
          <div className="flex flex-wrap items-center gap-2"><span className="break-words text-lg font-semibold">{client.name}</span>
            {client.status && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{clientStatusLabels[client.status]}</span>}</div>
          {(client.phone || client.email) && <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-600">
            {client.phone && <bdi dir="ltr">{client.phone}</bdi>}{client.email && <bdi className="break-all" dir="ltr">{client.email}</bdi>}
          </div>}
        </Link>
      </li>)}</ul> : <p className="text-sm text-stone-500">{query ? "לא נמצאו לקוחות בשם זה." : "אין לקוחות עדיין. אפשר להתחיל ביצירת לקוח חדש."}</p>}
    </div>
  </div>;
}
