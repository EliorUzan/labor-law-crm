import "server-only";

import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { createDatabaseClient } from "@/db/client";
import {
  clientObligations,
  clients,
  deadlines,
  financialRecords,
  importantDates,
  matters,
  tasks,
} from "@/db/schema";

import { getJerusalemMonthRange, orderTasksByDeadline } from "./format";

const DASHBOARD_LIST_LIMIT = 8;

export type DashboardData = {
  generatedAt: Date;
  deadlines: Array<{ title: string; matterTitle: string; deadlineAt: Date; isOverdue: boolean }>;
  tasks: Array<{
    title: string;
    matterTitle: string;
    deadlineTitle: string | null;
    deadlineAt: Date | null;
  }>;
  importantDates: Array<{ title: string; matterTitle: string; eventAt: Date; type: string | null }>;
  obligations: Array<{
    title: string;
    clientName: string;
    matterTitle: string | null;
    dueDate: string | null;
  }>;
  recentMatters: Array<{ title: string; clientName: string; status: string | null }>;
  financialSummary: { outstandingAmount: string; paymentsReceivedThisMonth: string };
};

/** Loads the small, owner-scoped read model needed by the dashboard. */
export async function getDashboardData(ownerUserId: string): Promise<DashboardData> {
  const database = createDatabaseClient();
  const generatedAt = new Date();
  const { monthStart, nextMonthStart } = getJerusalemMonthRange(generatedAt);

  const [deadlineRows, taskRows, importantDateRows, obligationRows, recentMatterRows, financialRows] =
    await Promise.all([
      database
        .select({
          title: deadlines.title,
          matterTitle: matters.title,
          deadlineAt: deadlines.deadlineAt,
        })
        .from(deadlines)
        .innerJoin(
          matters,
          and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId)),
        )
        .where(eq(deadlines.ownerUserId, ownerUserId))
        .orderBy(asc(deadlines.deadlineAt))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({
          title: tasks.title,
          matterTitle: matters.title,
          deadlineTitle: deadlines.title,
          deadlineAt: deadlines.deadlineAt,
        })
        .from(tasks)
        .innerJoin(
          matters,
          and(eq(matters.id, tasks.matterId), eq(matters.ownerUserId, ownerUserId)),
        )
        .leftJoin(
          deadlines,
          and(eq(deadlines.id, tasks.deadlineId), eq(deadlines.ownerUserId, ownerUserId)),
        )
        .where(and(eq(tasks.ownerUserId, ownerUserId), eq(tasks.done, false)))
        .orderBy(asc(deadlines.deadlineAt), desc(tasks.createdAt))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({
          title: importantDates.title,
          matterTitle: matters.title,
          eventAt: importantDates.eventAt,
          type: importantDates.type,
        })
        .from(importantDates)
        .innerJoin(
          matters,
          and(eq(matters.id, importantDates.matterId), eq(matters.ownerUserId, ownerUserId)),
        )
        .where(and(eq(importantDates.ownerUserId, ownerUserId), gte(importantDates.eventAt, generatedAt)))
        .orderBy(asc(importantDates.eventAt))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({
          title: clientObligations.title,
          clientName: clients.name,
          matterTitle: matters.title,
          dueDate: clientObligations.dueDate,
        })
        .from(clientObligations)
        .innerJoin(
          clients,
          and(
            eq(clients.id, clientObligations.clientId),
            eq(clients.ownerUserId, ownerUserId),
          ),
        )
        .leftJoin(
          matters,
          and(eq(matters.id, clientObligations.matterId), eq(matters.ownerUserId, ownerUserId)),
        )
        .where(and(eq(clientObligations.ownerUserId, ownerUserId), eq(clientObligations.done, false)))
        .orderBy(asc(clientObligations.dueDate), desc(clientObligations.createdAt))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({ title: matters.title, clientName: clients.name, status: matters.status })
        .from(matters)
        .innerJoin(
          clients,
          and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)),
        )
        .where(eq(matters.ownerUserId, ownerUserId))
        .orderBy(desc(matters.updatedAt))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({
          outstandingAmount: sql<string>`coalesce(sum(case when ${financialRecords.type} in ('fee', 'charge') then ${financialRecords.amount} else -${financialRecords.amount} end), 0)`,
          paymentsReceivedThisMonth: sql<string>`coalesce(sum(case when ${financialRecords.type} = 'payment' and ${financialRecords.recordDate} >= ${monthStart} and ${financialRecords.recordDate} < ${nextMonthStart} then ${financialRecords.amount} else 0 end), 0)`,
        })
        .from(financialRecords)
        .where(eq(financialRecords.ownerUserId, ownerUserId)),
    ]);

  return {
    generatedAt,
    deadlines: deadlineRows.map((row) => ({
      ...row,
      isOverdue: row.deadlineAt < generatedAt,
    })),
    tasks: orderTasksByDeadline(taskRows),
    importantDates: importantDateRows,
    obligations: obligationRows,
    recentMatters: recentMatterRows,
    financialSummary: {
      outstandingAmount: financialRows[0]?.outstandingAmount ?? "0",
      paymentsReceivedThisMonth: financialRows[0]?.paymentsReceivedThisMonth ?? "0",
    },
  };
}
