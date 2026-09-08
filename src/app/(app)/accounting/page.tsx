import { requireAuthenticatedUserId } from "@/lib/auth";
import { JERUSALEM_TIME_ZONE } from "@/modules/dashboard/format";
import { AccountingPageContent } from "@/modules/accounting/accounting-page";
import { accountingMonth, getAccountingFormOptions, getAccountingOverview } from "@/modules/accounting/queries";

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId(); const { month } = await searchParams; const selected = accountingMonth(month);
  const [data, options] = await Promise.all([getAccountingOverview(ownerUserId, selected), getAccountingFormOptions(ownerUserId)]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <AccountingPageContent data={data} options={options} today={today} />;
}
