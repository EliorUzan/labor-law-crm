import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { financialRecords } from "@/db/schema";
import { getJerusalemMonthRange } from "@/modules/dashboard/format";

/** One exact Postgres aggregation for both client balances and the Dashboard. */
export async function getFinancialSummary(ownerUserId: string, clientId?: string, now = new Date()) {
  const { monthStart, nextMonthStart } = getJerusalemMonthRange(now);
  const [summary] = await createDatabaseClient().select({
    totalCharges: sql<string>`coalesce(sum(case when ${financialRecords.type} in ('fee', 'charge') then ${financialRecords.amount} else 0 end), 0)`,
    totalPayments: sql<string>`coalesce(sum(case when ${financialRecords.type} = 'payment' then ${financialRecords.amount} else 0 end), 0)`,
    outstandingAmount: sql<string>`coalesce(sum(case when ${financialRecords.type} in ('fee', 'charge') then ${financialRecords.amount} else -${financialRecords.amount} end), 0)`,
    paymentsReceivedThisMonth: sql<string>`coalesce(sum(case when ${financialRecords.type} = 'payment' and ${financialRecords.recordDate} >= ${monthStart} and ${financialRecords.recordDate} < ${nextMonthStart} then ${financialRecords.amount} else 0 end), 0)`,
  }).from(financialRecords).where(and(
    eq(financialRecords.ownerUserId, ownerUserId),
    clientId ? eq(financialRecords.clientId, clientId) : undefined,
  ));
  return summary ?? { totalCharges: "0", totalPayments: "0", outstandingAmount: "0", paymentsReceivedThisMonth: "0" };
}
