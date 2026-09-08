import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { JERUSALEM_TIME_ZONE } from "@/modules/dashboard/format";
import { getMatterDetail } from "@/modules/matters/queries";
import { MatterDetailView } from "@/modules/matters/matter-detail";

export default async function MatterPage({ params }: { params: Promise<{ matterId: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const { matterId } = await params;
  const data = await getMatterDetail(ownerUserId, matterId);
  if (!data) notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <MatterDetailView data={data} today={today} />;
}
