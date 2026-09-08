import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { JERUSALEM_TIME_ZONE } from "@/modules/dashboard/format";
import { getMatterDetail } from "@/modules/matters/queries";
import { MatterDetailView } from "@/modules/matters/matter-detail";
import { getMatterWork } from "@/modules/work/queries";
import { MatterWorkSections } from "@/modules/work/matter-work";

export default async function MatterPage({ params }: { params: Promise<{ matterId: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const { matterId } = await params;
  const data = await getMatterDetail(ownerUserId, matterId);
  if (!data) notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const work = await getMatterWork(ownerUserId, matterId);
  return <MatterDetailView data={data} today={today} work={<MatterWorkSections matterId={matterId} data={work} now={new Date()} />} />;
}
