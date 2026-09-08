import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getClient } from "@/modules/clients/queries";
import { panelClass } from "@/modules/clients/presentation";
import { MatterForm } from "@/modules/matters/forms";

export default async function NewMatterPage({ params }: { params: Promise<{ clientId: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const { clientId } = await params;
  const client = await getClient(ownerUserId, clientId);
  if (!client) notFound();
  return <div className="mx-auto max-w-2xl space-y-4">
    <Link className="text-sm text-teal-700 underline" href={`/clients/${clientId}`}><bdi>{client.name}</bdi></Link>
    <h1 className="text-2xl font-bold">תיק חדש</h1>
    <div className={panelClass}><MatterForm clientId={clientId} /></div>
  </div>;
}
