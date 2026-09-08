import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { panelClass } from "@/modules/clients/presentation";
import { MatterForm } from "@/modules/matters/forms";
import { getMatter } from "@/modules/matters/queries";

export default async function EditMatterPage({ params }: { params: Promise<{ matterId: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const { matterId } = await params;
  const data = await getMatter(ownerUserId, matterId);
  if (!data) notFound();
  const { title, caseType, status, openDate, caseNumber, courtOrTribunal, opposingParty, opposingAttorneyName,
    opposingAttorneyPhone, opposingAttorneyEmail, opposingAttorneyFirm } = data.matter;
  return <div className="mx-auto max-w-2xl space-y-4">
    <Link className="text-sm text-teal-700 underline" href={`/matters/${matterId}`}><bdi>{title}</bdi></Link>
    <h1 className="text-2xl font-bold">עריכת תיק</h1>
    <p className="text-sm text-stone-600">לקוח: <bdi>{data.client.name}</bdi></p>
    <div className={panelClass}><MatterForm clientId={data.client.id} matterId={matterId} initial={{ title, caseType, status, openDate,
      caseNumber, courtOrTribunal, opposingParty, opposingAttorneyName, opposingAttorneyPhone, opposingAttorneyEmail, opposingAttorneyFirm }} /></div>
  </div>;
}
