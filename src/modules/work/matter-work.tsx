import Link from "next/link";
import { panelClass } from "@/modules/clients/presentation";
import { formatIsraeliDate, formatIsraeliDateTime } from "@/modules/dashboard/format";
import { DeleteWorkRecordForm, WorkForm, TaskCheckbox } from "./forms";
import { defaultImportantDateTypes, importantDateTypeColor, importantDateTypeLabel, type ImportantDateTypeOption } from "./presentation";
import { ImportantDateTypeManager } from "./type-manager";
import { isDeadlineOverdue, isDeadlineResolved, toJerusalemDate, toJerusalemInput } from "./time";
import type { MatterWork } from "./queries";

export function MatterWorkSections({ matterId, data, now, typeOptions = defaultImportantDateTypes }: { matterId: string; data: MatterWork; now: Date; typeOptions?: readonly ImportantDateTypeOption[] }) {
  const options = data.deadlines.map((deadline) => ({ id: deadline.id, label: `${deadline.title} — ${formatIsraeliDate(toJerusalemDate(deadline.deadlineAt))}` }));
  const taskList = (done: boolean) => {
    const rows = data.tasks.filter((task) => task.done === done);
    return rows.length ? <ul className="mt-3 divide-y divide-stone-100">{rows.map((task) => <li className="py-3" key={task.id} id={`task-${task.id}`}>
      <TaskCheckbox matterId={matterId} taskId={task.id} done={task.done} title={task.title} />
      {task.deadlineAt && <p className="mt-1 break-words text-sm text-teal-800"><a href={`#deadline-${task.deadlineId}`} className="underline">
        דדליין: <bdi>{task.deadlineTitle}</bdi> · <bdi dir="ltr">{formatIsraeliDate(toJerusalemDate(task.deadlineAt))}</bdi>
      </a></p>}
      {task.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-600" dir="auto">{task.description}</p>}
      <details className="mt-2"><summary className="cursor-pointer text-sm text-teal-700">עריכת משימה</summary>
        <WorkForm key={task.updatedAt.toISOString()} kind="task" matterId={matterId} recordId={task.id} deadlines={options}
          initial={{ title: task.title, description: task.description ?? "", deadlineId: task.deadlineId ?? "" }} />
      </details>
    </li>)}</ul> : <p className="mt-3 text-sm text-stone-500">{done ? "אין משימות שהושלמו" : "אין משימות פתוחות"}</p>;
  };
  return <div className="space-y-5">
    <section className={`${panelClass} border-amber-300`} id="deadlines">
      <h2 className="text-xl font-bold">דדליינים</h2>
      <details className="mt-4 rounded-lg border border-amber-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף דדליין</summary>
        <WorkForm kind="deadline" matterId={matterId} typeOptions={[...typeOptions]} />
      </details>
      <ImportantDateTypeManager options={typeOptions} />
      {data.deadlines.length ? <ol className="mt-4 space-y-3">{data.deadlines.map((deadline) => {
        const linkedTasks = data.tasks.filter((task) => task.deadlineId === deadline.id);
        const resolved = isDeadlineResolved(linkedTasks);
        const overdue = isDeadlineOverdue(deadline.deadlineAt, now, linkedTasks);
        const linkedObligations = data.obligations.filter((obligation) => obligation.deadlineId === deadline.id);
        return <li key={deadline.id} id={`deadline-${deadline.id}`} className={`rounded-lg border p-4 ${overdue ? "border-red-200 bg-red-50" : resolved ? "border-stone-200 bg-stone-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <time className="text-lg font-bold" dateTime={deadline.deadlineAt.toISOString()} dir="ltr">{formatIsraeliDate(toJerusalemDate(deadline.deadlineAt))}</time>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${overdue ? "bg-red-100 text-red-800" : resolved ? "bg-stone-200 text-stone-700" : "bg-amber-100 text-amber-900"}`}>{overdue ? "באיחור — המועד עבר" : resolved ? "טופל — כל המשימות הושלמו" : "מועד קרוב"}</span>
          </div>
          <h3 className="mt-2 break-words font-semibold" dir="auto">{deadline.title}</h3>
          {deadline.type && <p className="mt-1 inline-flex items-center gap-1 text-sm text-stone-600"><span className="size-2.5 rounded-full" style={{ backgroundColor: importantDateTypeColor(deadline.type, typeOptions) }} aria-hidden />{importantDateTypeLabel(deadline.type)}</p>}
          {deadline.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm" dir="auto">{deadline.description}</p>}
          {linkedTasks.length > 0 && <div className="mt-3 text-sm"><h4 className="font-semibold">משימות מקושרות</h4>
            <ul className="mt-1 space-y-1">{linkedTasks.map((task) => <li key={task.id} className="break-words">
              <a className={`underline ${task.done ? "text-stone-500" : "text-teal-800"}`} href={`#task-${task.id}`}><bdi>{task.title}</bdi></a>
              {task.done && <span className="ms-2 text-stone-500">הושלמה</span>}
            </li>)}</ul>
          </div>}
          {linkedObligations.length > 0 && <div className="mt-3 text-sm"><h4 className="font-semibold">התחייבויות ללקוח</h4>
            <ul className="mt-1 space-y-1">{linkedObligations.map((obligation) => <li key={obligation.id} className="break-words">
              <Link className={`underline ${obligation.done ? "text-stone-500" : "text-teal-800"}`} href={`/clients/${obligation.clientId}#obligation-${obligation.id}`}><bdi>{obligation.title}</bdi></Link>
              {obligation.done && <span className="ms-2 text-stone-500">הושלמה</span>}
            </li>)}</ul>
          </div>}
          <details className="mt-3"><summary className="cursor-pointer text-sm text-teal-700">עריכת דדליין</summary>
            <WorkForm key={deadline.updatedAt.toISOString()} kind="deadline" matterId={matterId} recordId={deadline.id}
              initial={{ title: deadline.title, description: deadline.description ?? "", deadlineDate: toJerusalemDate(deadline.deadlineAt),
                type: deadline.type ?? "submissionDeadline",
                ...(toJerusalemInput(deadline.deadlineAt).slice(11, 16) !== "17:00" ? { deadlineTime: toJerusalemInput(deadline.deadlineAt).slice(11, 16) } : {}) }} typeOptions={[...typeOptions]} />
          </details>
          <DeleteWorkRecordForm matterId={matterId} recordId={deadline.id} kind="deadline" />
        </li>;
      })}</ol> : <p className="mt-4 text-sm text-stone-500">אין דדליינים בתיק</p>}
    </section>
    <section className={panelClass} id="tasks">
      <h2 className="text-lg font-bold">משימות פתוחות</h2>
      <details className="mt-4 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף משימה</summary>
        <WorkForm kind="task" matterId={matterId} deadlines={options} />
      </details>
      {taskList(false)}
      <div className="mt-5 border-t border-stone-200 pt-4">
        <h3 className="font-semibold text-stone-500">משימות שהושלמו</h3>
        {taskList(true)}
      </div>
    </section>
    <section className={panelClass} id="important-dates">
      <h2 className="text-lg font-bold">תאריכים חשובים</h2>
      <details className="mt-4 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף תאריך חשוב</summary>
        <WorkForm kind="importantDate" matterId={matterId} typeOptions={[...typeOptions]} />
      </details>
      <ImportantDateTypeManager options={typeOptions} />
      {data.importantDates.length ? <ol className="mt-4 divide-y divide-stone-100">{data.importantDates.map((event) => <li key={event.id} className="py-4">
        <time className="font-semibold text-teal-800" dateTime={event.eventAt.toISOString()} dir="ltr">{formatIsraeliDateTime(event.eventAt)}</time>
        <h3 className="mt-1 break-words font-semibold" dir="auto">{event.title}</h3>
        {event.type && <p className="mt-1 inline-flex items-center gap-1 text-sm text-stone-500" dir="auto"><span className="size-2.5 rounded-full" style={{ backgroundColor: importantDateTypeColor(event.type, typeOptions) }} aria-hidden />{importantDateTypeLabel(event.type)}</p>}
        {event.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-600" dir="auto">{event.description}</p>}
        <details className="mt-3"><summary className="cursor-pointer text-sm text-teal-700">עריכת תאריך חשוב</summary>
          <WorkForm key={event.updatedAt.toISOString()} kind="importantDate" matterId={matterId} recordId={event.id}
            initial={{ title: event.title, description: event.description ?? "", eventAt: toJerusalemInput(event.eventAt), type: event.type ?? "" }} typeOptions={[...typeOptions]} />
        </details>
        <DeleteWorkRecordForm matterId={matterId} recordId={event.id} kind="importantDate" />
      </li>)}</ol> : <p className="mt-4 text-sm text-stone-500">אין תאריכים חשובים</p>}
    </section>
  </div>;
}
