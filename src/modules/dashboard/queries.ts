import "server-only";

import { aliasedTable, and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";

import { createDatabaseClient } from "@/db/client";
import {
  clientObligations,
  accountingObligations,
  clients,
  deadlines,
  financialRecords,
  importantDates,
  matters,
  tasks,
} from "@/db/schema";

import { orderTasksByDeadline } from "./format";
import { getFinancialSummary } from "@/modules/clients/financial-summary";
import { isDeadlineOverdue } from "@/modules/work/time";
import { getImportantDateTypes } from "@/modules/work/types";

const DASHBOARD_LIST_LIMIT = 8;

/** A Deadline stays active until all of its linked Tasks and Client Obligations are complete. */
function activeDeadlineCondition(ownerUserId: string) {
  return sql`(
    (
      not exists (select 1 from ${tasks} where ${tasks.ownerUserId} = ${ownerUserId} and ${tasks.deadlineId} = ${deadlines.id})
      and not exists (select 1 from ${clientObligations} where ${clientObligations.ownerUserId} = ${ownerUserId} and ${clientObligations.deadlineId} = ${deadlines.id})
    )
    or exists (select 1 from ${tasks} where ${tasks.ownerUserId} = ${ownerUserId} and ${tasks.deadlineId} = ${deadlines.id} and ${tasks.done} = false)
    or exists (select 1 from ${clientObligations} where ${clientObligations.ownerUserId} = ${ownerUserId} and ${clientObligations.deadlineId} = ${deadlines.id} and ${clientObligations.done} = false)
  )`;
}

type CalendarDeadlineRow = {
  id: string;
  clientId: string;
  matterId: string;
  title: string;
  matterTitle: string;
  clientName: string;
  eventAt: Date;
  description: string | null;
  type: string | null;
};

function isMissingCalendarSchema(error: unknown) {
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = candidate?.code ?? candidate?.cause?.code;
  const message = `${candidate?.message ?? ""} ${candidate?.cause?.message ?? ""}`;
  return code === "42P01" || code === "42703" || /important_date_types|deadlines.*type|column .*type.*does not exist/i.test(message);
}

async function loadCalendarDeadlineRows(database: ReturnType<typeof createDatabaseClient>, ownerUserId: string): Promise<CalendarDeadlineRow[]> {
  try {
    return await database.select({ id: deadlines.id, clientId: clients.id, matterId: deadlines.matterId, title: deadlines.title, matterTitle: matters.title,
      clientName: clients.name, eventAt: deadlines.deadlineAt, description: deadlines.description, type: deadlines.type })
      .from(deadlines)
      .innerJoin(matters, and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(eq(deadlines.ownerUserId, ownerUserId))
      .orderBy(asc(deadlines.deadlineAt), asc(deadlines.id));
  } catch (error) {
    if (!isMissingCalendarSchema(error)) throw error;
    return await database.select({ id: deadlines.id, clientId: clients.id, matterId: deadlines.matterId, title: deadlines.title, matterTitle: matters.title,
      clientName: clients.name, eventAt: deadlines.deadlineAt, description: deadlines.description, type: sql<string | null>`null` })
      .from(deadlines)
      .innerJoin(matters, and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(eq(deadlines.ownerUserId, ownerUserId))
      .orderBy(asc(deadlines.deadlineAt), asc(deadlines.id));
  }
}

export type DashboardData = {
  generatedAt: Date;
  deadlines: Array<{ id: string; clientId: string; clientName: string; matterId: string; title: string; matterTitle: string; deadlineAt: Date; isOverdue: boolean }>;
  tasks: Array<{
    id: string;
    clientId: string;
    clientName: string;
    matterId: string;
    title: string;
    matterTitle: string;
    deadlineTitle: string | null;
    deadlineAt: Date | null;
  }>;
  importantDates: Array<{ id: string; clientId: string; clientName: string; matterId: string; title: string; matterTitle: string; eventAt: Date; type: string | null }>;
  obligations: Array<{
    id: string;
    clientId: string;
    title: string;
    clientName: string;
    matterId: string | null;
    matterTitle: string | null;
    deadlineId: string | null;
    deadlineTitle: string | null;
    deadlineAt: Date | null;
    dueDate: string | null;
  }>;
  accountingObligations?: Array<{ id: string; title: string; dueDate: string | null; type: string | null }>;
  recentMatters: Array<{ id: string; clientId: string; title: string; clientName: string; status: string | null }>;
  financialSummary: { outstandingAmount: string; paymentsReceivedThisMonth: string };
  financialActivity?: Array<{ id: string; clientId: string; clientName: string; matterId: string | null; matterTitle: string | null; type: "fee" | "charge" | "payment"; amount: string; recordDate: string; description: string | null; updatedAt: Date }>;
  calendarEvents?: Array<{
    id: string; kind: "importantDate" | "deadline"; clientId: string; matterId: string; title: string;
    matterTitle: string; clientName: string; eventAt: Date; description: string | null; type: string | null;
  }>;
  matterOptions?: Array<{ id: string; clientId: string; title: string; clientName: string }>;
  typeOptions?: Awaited<ReturnType<typeof getImportantDateTypes>>;
};

/** Loads the small, owner-scoped read model needed by the dashboard. */
export async function getDashboardData(ownerUserId: string): Promise<DashboardData> {
  const database = createDatabaseClient();
  const deadlineMatter = aliasedTable(matters, "dashboard_deadline_matters");
  const generatedAt = new Date();

  // Separate limits keep historical deadlines from crowding out upcoming work.
  const deadlineQuery = (overdue: boolean) => database
    .select({ id: deadlines.id, clientId: clients.id, clientName: clients.name, matterId: matters.id, title: deadlines.title, matterTitle: matters.title, deadlineAt: deadlines.deadlineAt })
    .from(deadlines)
    .innerJoin(matters, and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId)))
    .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
    .where(and(eq(deadlines.ownerUserId, ownerUserId), activeDeadlineCondition(ownerUserId), overdue ? lt(deadlines.deadlineAt, generatedAt) : gte(deadlines.deadlineAt, generatedAt)))
    .orderBy(asc(deadlines.deadlineAt), asc(deadlines.id))
    .limit(DASHBOARD_LIST_LIMIT);
  const [overdueRows, upcomingRows, taskRows, importantDateRows, obligationRows, accountingObligationRows, recentMatterRows, financialSummary, financialActivity, calendarImportantDateRows, calendarDeadlineRows, matterOptions, typeOptions] =
    await Promise.all([
      deadlineQuery(true),
      deadlineQuery(false),
      database
        .select({
          id: tasks.id,
          clientId: clients.id,
          clientName: clients.name,
          matterId: matters.id,
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
        .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
        .leftJoin(
          deadlines,
          and(eq(deadlines.id, tasks.deadlineId), eq(deadlines.matterId, tasks.matterId), eq(deadlines.ownerUserId, ownerUserId)),
        )
        .where(and(eq(tasks.ownerUserId, ownerUserId), eq(tasks.done, false)))
        .orderBy(sql`${deadlines.deadlineAt} asc nulls last`, desc(tasks.createdAt), asc(tasks.id))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({
          id: importantDates.id,
          clientId: clients.id,
          clientName: clients.name,
          matterId: matters.id,
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
        .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
        .where(and(eq(importantDates.ownerUserId, ownerUserId), gte(importantDates.eventAt, generatedAt)))
        .orderBy(asc(importantDates.eventAt), asc(importantDates.id))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({
          id: clientObligations.id,
          clientId: clientObligations.clientId,
          title: clientObligations.title,
          clientName: clients.name,
          matterId: sql<string | null>`coalesce(${clientObligations.matterId}, ${deadlineMatter.id})`,
          matterTitle: sql<string | null>`coalesce(${matters.title}, ${deadlineMatter.title})`,
          deadlineId: clientObligations.deadlineId,
          deadlineTitle: deadlines.title,
          deadlineAt: deadlines.deadlineAt,
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
          and(eq(matters.id, clientObligations.matterId), eq(matters.clientId, clientObligations.clientId), eq(matters.ownerUserId, ownerUserId)),
        )
        .leftJoin(deadlines, and(eq(deadlines.id, clientObligations.deadlineId), eq(deadlines.ownerUserId, ownerUserId)))
        .leftJoin(deadlineMatter, and(eq(deadlineMatter.id, deadlines.matterId), eq(deadlineMatter.ownerUserId, ownerUserId), eq(deadlineMatter.clientId, clientObligations.clientId)))
        .where(and(eq(clientObligations.ownerUserId, ownerUserId), eq(clientObligations.done, false)))
        .orderBy(asc(clientObligations.dueDate), desc(clientObligations.createdAt))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({ id: accountingObligations.id, title: accountingObligations.title, dueDate: accountingObligations.dueDate, type: accountingObligations.type })
        .from(accountingObligations)
        .where(and(eq(accountingObligations.ownerUserId, ownerUserId), eq(accountingObligations.done, false)))
        .orderBy(asc(accountingObligations.dueDate), desc(accountingObligations.createdAt), asc(accountingObligations.id))
        .limit(DASHBOARD_LIST_LIMIT),
      database
        .select({ id: matters.id, clientId: clients.id, title: matters.title, clientName: clients.name, status: matters.status })
        .from(matters)
        .innerJoin(
          clients,
          and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)),
        )
        .where(eq(matters.ownerUserId, ownerUserId))
        .orderBy(desc(matters.updatedAt))
        .limit(DASHBOARD_LIST_LIMIT),
      getFinancialSummary(ownerUserId, undefined, generatedAt),
      database.select({ id: financialRecords.id, clientId: clients.id, clientName: clients.name, matterId: financialRecords.matterId,
        matterTitle: matters.title, type: financialRecords.type, amount: financialRecords.amount, recordDate: financialRecords.recordDate,
        description: financialRecords.description, updatedAt: financialRecords.updatedAt })
        .from(financialRecords)
        .innerJoin(clients, and(eq(clients.id, financialRecords.clientId), eq(clients.ownerUserId, ownerUserId)))
        .leftJoin(matters, and(eq(matters.id, financialRecords.matterId), eq(matters.clientId, financialRecords.clientId), eq(matters.ownerUserId, ownerUserId)))
        .where(eq(financialRecords.ownerUserId, ownerUserId))
        .orderBy(desc(financialRecords.recordDate), desc(financialRecords.createdAt), desc(financialRecords.id))
        .limit(DASHBOARD_LIST_LIMIT),
      database.select({ id: importantDates.id, clientId: clients.id, matterId: importantDates.matterId, title: importantDates.title, matterTitle: matters.title,
        clientName: clients.name, eventAt: importantDates.eventAt, description: importantDates.description, type: importantDates.type })
        .from(importantDates)
        .innerJoin(matters, and(eq(matters.id, importantDates.matterId), eq(matters.ownerUserId, ownerUserId)))
        .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
        .where(eq(importantDates.ownerUserId, ownerUserId))
        .orderBy(asc(importantDates.eventAt), asc(importantDates.id)),
      loadCalendarDeadlineRows(database, ownerUserId),
      database.select({ id: matters.id, clientId: clients.id, title: matters.title, clientName: clients.name })
        .from(matters)
        .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
        .where(eq(matters.ownerUserId, ownerUserId)).orderBy(asc(matters.title), asc(matters.id)),
      getImportantDateTypes(ownerUserId),
    ]);

  return {
    generatedAt,
    deadlines: [...overdueRows, ...upcomingRows].map((row) => ({
      ...row,
      isOverdue: isDeadlineOverdue(row.deadlineAt, generatedAt),
    })),
    tasks: orderTasksByDeadline(taskRows),
    importantDates: importantDateRows,
    obligations: obligationRows,
    accountingObligations: accountingObligationRows,
    recentMatters: recentMatterRows,
    financialSummary,
    financialActivity,
    calendarEvents: [
      ...calendarImportantDateRows.map((row) => ({ ...row, kind: "importantDate" as const })),
      ...calendarDeadlineRows.map((row) => ({ ...row, kind: "deadline" as const })),
    ].sort((first, second) => first.eventAt.getTime() - second.eventAt.getTime()),
    matterOptions,
    typeOptions,
  };
}
