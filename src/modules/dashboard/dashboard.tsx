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
import { toJerusalemDate } from "@/modules/work/time";

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

export function Dashboard({ data }: Readonly<{ data: DashboardData }>) {
  const accountingObligations = data.accountingObligations ?? [];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-teal-700">ניהול משרד</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">לוח בקרה</h1>
      </header>

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
                  <Metadata>{deadline.matterTitle}</Metadata>
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
                    {task.matterTitle}
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
                    <Metadata>{[event.matterTitle, importantDateTypeLabel(event.type)].filter(Boolean).join(" · ")}</Metadata>
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
                  <Link className="font-medium text-stone-900 hover:text-teal-700 hover:underline" href={`/clients/${obligation.clientId}#obligations`}>{obligation.title}</Link>
                  <Metadata>
                    {[obligation.clientName, obligation.matterTitle].filter(Boolean).join(" · ")}
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
                  <Metadata>{[matter.clientName, matterStatusLabel(matter.status)].filter(Boolean).join(" · ")}</Metadata>
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
      </DashboardSection>
    </div>
  );
}
