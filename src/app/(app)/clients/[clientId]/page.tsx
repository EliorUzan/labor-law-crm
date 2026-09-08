import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getClientDetail } from "@/modules/clients/queries";
import { ClientDetailView } from "@/modules/clients/client-detail";
import { JERUSALEM_TIME_ZONE } from "@/modules/dashboard/format";
import { getClientTrustSummary } from "@/modules/accounting/queries";

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const { clientId } = await params;
  const data = await getClientDetail(ownerUserId, clientId);
  if (!data) notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const trustBalance = await getClientTrustSummary(ownerUserId, clientId);
  return <ClientDetailView data={data} today={today} trustBalance={trustBalance} />;
}
