import "server-only";
import { and, asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { clients, matters, tasks, deadlines, importantDates, clientObligations } from "@/db/schema";
import { workIdSchema } from "./validation";

export async function getMatterDeadline(ownerUserId: string, matterId: string, deadlineId: string) {
  if (![matterId, deadlineId].every((id) => workIdSchema.safeParse(id).success)) return null;
  const [row] = await createDatabaseClient().select({ id: deadlines.id }).from(deadlines)
    .innerJoin(matters, and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId)))
    .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
    .where(and(eq(deadlines.ownerUserId, ownerUserId), eq(deadlines.matterId, matterId), eq(deadlines.id, deadlineId))).limit(1);
  return row ?? null;
}

export async function getMatterWork(ownerUserId: string, matterId: string) {
  if (!workIdSchema.safeParse(matterId).success) return { tasks: [], deadlines: [], importantDates: [], obligations: [] };
  const database = createDatabaseClient();
  const [taskRows, deadlineRows, dateRows, obligationRows] = await Promise.all([
    database.select({ ...getTableColumns(tasks), deadlineTitle: deadlines.title, deadlineAt: deadlines.deadlineAt }).from(tasks)
      .innerJoin(matters, and(eq(matters.id, tasks.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .leftJoin(deadlines, and(eq(deadlines.id, tasks.deadlineId), eq(deadlines.matterId, tasks.matterId), eq(deadlines.ownerUserId, ownerUserId)))
      .where(and(eq(tasks.ownerUserId, ownerUserId), eq(tasks.matterId, matterId)))
      .orderBy(asc(tasks.done), sql`${deadlines.deadlineAt} asc nulls last`, desc(tasks.createdAt), asc(tasks.id)),
    database.select(getTableColumns(deadlines)).from(deadlines)
      .innerJoin(matters, and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(and(eq(deadlines.ownerUserId, ownerUserId), eq(deadlines.matterId, matterId)))
      .orderBy(asc(deadlines.deadlineAt), asc(deadlines.id)),
    database.select(getTableColumns(importantDates)).from(importantDates)
      .innerJoin(matters, and(eq(matters.id, importantDates.matterId), eq(matters.ownerUserId, ownerUserId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(and(eq(importantDates.ownerUserId, ownerUserId), eq(importantDates.matterId, matterId)))
      .orderBy(asc(importantDates.eventAt), asc(importantDates.id)),
    database.select({ id: clientObligations.id, clientId: clientObligations.clientId, deadlineId: clientObligations.deadlineId,
      title: clientObligations.title, done: clientObligations.done }).from(clientObligations)
      .innerJoin(deadlines, and(eq(deadlines.id, clientObligations.deadlineId), eq(deadlines.ownerUserId, ownerUserId), eq(deadlines.matterId, matterId)))
      .innerJoin(matters, and(eq(matters.id, deadlines.matterId), eq(matters.ownerUserId, ownerUserId), eq(matters.clientId, clientObligations.clientId)))
      .innerJoin(clients, and(eq(clients.id, matters.clientId), eq(clients.ownerUserId, ownerUserId)))
      .where(eq(clientObligations.ownerUserId, ownerUserId))
      .orderBy(asc(clientObligations.done), asc(clientObligations.createdAt), asc(clientObligations.id)),
  ]);
  return { tasks: taskRows, deadlines: deadlineRows, importantDates: dateRows, obligations: obligationRows };
}

export type MatterWork = Awaited<ReturnType<typeof getMatterWork>>;
