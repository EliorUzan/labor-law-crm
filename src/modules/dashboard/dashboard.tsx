import Link from "next/link";
import { matterStatusLabel } from "@/modules/matters/presentation";
import { importantDateTypeLabel } from "@/modules/work/presentation";
import {
  formatIsraeliDate,
  formatIsraeliDateTime,
  formatIsraeliShekels,
} from "./format";
import type { ReactNode } from "react";
import type { DashboardData } from "./queries";
import { SmartCalendar } from "./calendar";
import { defaultImportantDateTypes } from "@/modules/work/presentation";
import { toJerusalemDate } from "@/modules/work/time";
import { FinancialRecordForm, ObligationCompletion } from "@/modules/clients/forms";
import { financialTypeLabels } from "@/modules/clients/presentation";

function DashboardSection({
  title,
  children,
  className = "",
}: Readonly<{ title: string; children: ReactNode; className?: string }>) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-5 sm:p-6 ${className}`}>
      <h2 className="text-lg font-bold text-stone-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="py-2 text-sm text-stone-500">{children}</p>;
}

function Metadata({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="mt-1 text-sm text-stone-500">{children}</p>;
}

/** Keeps the Client → Matter context visible and independently navigable in every Dashboard row. */
function MatterContext({ clientId, clientName, matterId, matterTitle }: {
  clientId: string; clientName: string; matterId: string; matterTitle: string;
}) {
  return <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1" dir="rtl">
    <Link className="break-words text-teal-700 underline" href={`/clients/${clientId}`}><bdi>{clientName}</bdi></Link>
    <span aria-hidden="true">|</span>
    <Link className="break-words text-teal-700 underline" href={`/matters/${matterId}`}><bdi>{matterTitle}</bdi></Link>
  </span>;
}

export function Dashboard({ data }: Readonly<{ data: DashboardData }>) {
  const accountingObligations = data.accountingObligations ?? [];
  const financialActivity = data.financialActivity ?? [];
  const matterOptions = data.matterOptions ?? [];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-teal-700">ניהול משרד</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">לוח בקרה</h1>
      </header>

      <SmartCalendar events={data.calendarEvents ?? []} matters={data.matterOptions ?? []} options={data.typeOptions ?? defaultImportantDateTypes} initialDate={data.generatedAt} />

      <DashboardSection className="border-teal-200" title="דדליינים">
        <p className="mb-4 text-xs text-stone-500">עד 8 דדליינים באיחור ו־8 דדליינים קרובים. הרשימה המלאה נמצאת בכל תיק.</p>
        {data.deadlines.length === 0 ? (
          <EmptyState>אין דדליינים קרובים</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {data.deadlines.map((deadline) => (
              <li className="flex flex-wrap items-start justify-between gap-4 py-3 first:pt-0 last:pb-0" key={deadline.id}>
                <div className="min-w-0">
                  <Link className="break-words font-medium text-stone-900 hover:text-teal-700 hover:underline" href={`/matters/${deadline.matterId}#deadlines`}><bdi>{deadline.title}</bdi></Link>
                  <Metadata><MatterContext clientId={deadline.clientId} clientName={deadline.clientName} matterId={deadline.matterId} matterTitle={deadline.matterTitle} /></Metadata>
                </div>
                <div className="shrink-0 text-left">
                  <p className="text-sm font-medium text-stone-700" dir="ltr">
                    {formatIsraeliDate(toJerusalemDate(deadline.deadlineAt))}
                  </p>
                  {deadline.isOverdue ? (
                    <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      באיחור
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="משימות פתוחות">
          {data.tasks.length === 0 ? (
            <EmptyState>אין משימות פתוחות</EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.tasks.map((task) => (
                <li className="py-3 first:pt-0 last:pb-0" key={task.id}>
                  <Link className="break-words font-medium text-stone-900 hover:text-teal-700 hover:underline" href={`/matters/${task.matterId}#tasks`}><bdi>{task.title}</bdi></Link>
                  <Metadata>
                    <MatterContext clientId={task.clientId} clientName={task.clientName} matterId={task.matterId} matterTitle={task.matterTitle} />
                    {task.deadlineTitle && task.deadlineAt
                      ? ` · דדליין: ${task.deadlineTitle} (${formatIsraeliDate(toJerusalemDate(task.deadlineAt))})`
                      : ""}
                  </Metadata>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection title="תאריכים חשובים">
          {data.importantDates.length === 0 ? (
            <EmptyState>אין תאריכים חשובים קרובים</EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.importantDates.map((event) => (
                <li className="flex flex-wrap items-start justify-between gap-4 py-3 first:pt-0 last:pb-0" key={event.id}>
                  <div className="min-w-0">
                    <Link className="break-words font-medium text-stone-900 hover:text-teal-700 hover:underline" href={`/matters/${event.matterId}#important-dates`}><bdi>{event.title}</bdi></Link>
                    <Metadata><MatterContext clientId={event.clientId} clientName={event.clientName} matterId={event.matterId} matterTitle={event.matterTitle} />{importantDateTypeLabel(event.type) && <> · {importantDateTypeLabel(event.type)}</>}</Metadata>
                  </div>
                  <p className="shrink-0 text-left text-sm text-stone-600" dir="ltr">
                    {formatIsraeliDateTime(event.eventAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection title="התחייבויות פתוחות ללקוחות">
          {data.obligations.length === 0 ? (
            <EmptyState>אין התחייבויות פתוחות ללקוחות</EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.obligations.map((obligation) => (
                <li className="py-3 first:pt-0 last:pb-0" key={obligation.id}>
                  <div className="flex items-start justify-between gap-3"><Link className="font-medium text-stone-900 hover:text-teal-700 hover:underline" href={`/clients/${obligation.clientId}#obligations`}>{obligation.title}</Link>
                    <ObligationCompletion clientId={obligation.clientId} obligationId={obligation.id} title={obligation.title} done={false} compact />
                  </div>
                  <Metadata>
                    {obligation.matterId && obligation.matterTitle ? <MatterContext clientId={obligation.clientId} clientName={obligation.clientName} matterId={obligation.matterId} matterTitle={obligation.matterTitle} /> : <Link className="text-teal-700 underline" href={`/clients/${obligation.clientId}`}><bdi>{obligation.clientName}</bdi></Link>}
                    {obligation.matterId && obligation.matterTitle && obligation.deadlineAt
                      ? ` · דדליין: ${obligation.deadlineTitle} (${formatIsraeliDate(toJerusalemDate(obligation.deadlineAt))})`
                      : obligation.dueDate ? ` · עד ${formatIsraeliDate(obligation.dueDate)}` : ""}
                  </Metadata>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection title="התחייבויות הנהלת חשבונות">
          {accountingObligations.length === 0 ? <EmptyState>אין התחייבויות הנהלת חשבונות פתוחות</EmptyState> : <ul className="divide-y divide-stone-100">{accountingObligations.map((obligation) => <li className="py-3 first:pt-0 last:pb-0" key={obligation.id}>
            <Link className="font-medium text-stone-900 hover:text-teal-700 hover:underline" href="/accounting">{obligation.title}</Link>
            {(obligation.dueDate || obligation.type) && <Metadata>{[obligation.dueDate && `עד ${formatIsraeliDate(obligation.dueDate)}`, obligation.type].filter(Boolean).join(" · ")}</Metadata>}
          </li>)}</ul>}
        </DashboardSection>

        <DashboardSection title="תיקים אחרונים">
          {data.recentMatters.length === 0 ? (
            <EmptyState>אין תיקים להצגה</EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.recentMatters.map((matter) => (
                <li className="py-3 first:pt-0 last:pb-0" key={matter.id}>
                  <Link className="break-words font-medium text-stone-900 hover:text-teal-700 hover:underline" href={`/matters/${matter.id}`}><bdi>{matter.title}</bdi></Link>
                  <Metadata><MatterContext clientId={matter.clientId} clientName={matter.clientName} matterId={matter.id} matterTitle={matter.title} />{matterStatusLabel(matter.status) && <> · {matterStatusLabel(matter.status)}</>}</Metadata>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>
      </div>

      <DashboardSection title="סיכום כספי">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-stone-500">יתרה פתוחה</dt>
            <dd className="mt-1 text-2xl font-bold text-stone-900" dir="ltr">
              {formatIsraeliShekels(data.financialSummary.outstandingAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">תשלומים שהתקבלו החודש</dt>
            <dd className="mt-1 text-2xl font-bold text-stone-900" dir="ltr">
              {formatIsraeliShekels(data.financialSummary.paymentsReceivedThisMonth)}
            </dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-stone-200 pt-4">
          <h3 className="font-semibold text-stone-900">פעילות כספית אחרונה</h3>
          {financialActivity.length === 0 ? <EmptyState>אין פעילות כספית להצגה</EmptyState> : <ul className="mt-3 divide-y divide-stone-100">{financialActivity.map((record) => <li key={record.id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{financialTypeLabels[record.type]} <span className="text-sm font-normal text-stone-500">· {formatIsraeliDate(record.recordDate)}</span></p>
              <Metadata>{record.matterId && record.matterTitle ? <MatterContext clientId={record.clientId} clientName={record.clientName} matterId={record.matterId} matterTitle={record.matterTitle} /> : <Link className="text-teal-700 underline" href={`/clients/${record.clientId}`}><bdi>{record.clientName}</bdi></Link>}</Metadata>
              {record.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-600" dir="auto">{record.description}</p>}</div>
              <bdi className="shrink-0 font-semibold" dir="ltr">{formatIsraeliShekels(record.amount)}</bdi></div>
            <details className="mt-3"><summary className="cursor-pointer text-sm text-teal-700">עריכת רשומה כספית</summary>
              <FinancialRecordForm key={record.updatedAt.toISOString()} clientId={record.clientId} recordId={record.id} matters={matterOptions.filter((matter) => matter.clientId === record.clientId)} today={toJerusalemDate(data.generatedAt)} initial={{ type: record.type, amount: record.amount, recordDate: record.recordDate, matterId: record.matterId, description: record.description }} />
            </details>
          </li>)}</ul>}
        </div>
      </DashboardSection>
    </div>
  );
}
