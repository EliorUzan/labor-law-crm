import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { ClientForm } from "@/modules/clients/forms";
import { getClient } from "@/modules/clients/queries";
import { panelClass } from "@/modules/clients/presentation";

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const { clientId } = await params;
  const client = await getClient(ownerUserId, clientId);
  if (!client) notFound();
  const { name, phone, email, address, notes, status } = client;
  return <div className="mx-auto max-w-2xl space-y-4">
    <Link className="text-sm text-teal-700 underline" href={`/clients/${clientId}`}>{name}</Link>
    <h1 className="text-2xl font-bold">עריכת לקוח</h1>
    <div className={panelClass}><ClientForm clientId={clientId} initial={{ name, phone, email, address, notes, status }} /></div>
  </div>;
}
