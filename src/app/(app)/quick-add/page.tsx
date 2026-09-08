import Link from "next/link";
import { z } from "zod";

import { requireAuthenticatedUserId } from "@/lib/auth";
import { getAccountingFormOptions } from "@/modules/accounting/queries";
import { AccountingObligationForm, ExpenseForm, ManualIncomeForm, TrustTransactionForm } from "@/modules/accounting/forms";
import { getClientDetail } from "@/modules/clients/queries";
import { FinancialRecordForm, ObligationForm, ClientForm } from "@/modules/clients/forms";
import { inputClass, panelClass } from "@/modules/clients/presentation";
import { MatterForm } from "@/modules/matters/forms";
import { WorkForm } from "@/modules/work/forms";
import { JERUSALEM_TIME_ZONE } from "@/modules/dashboard/format";

const types = ["client", "matter", "task", "deadline", "important-date", "obligation", "financial", "expense", "income", "trust", "accounting-obligation"] as const;
type QuickAddType = (typeof types)[number];
const typeSchema = z.enum(types);
const idSchema = z.string().uuid().catch("");
const newRecordTitles: Record<QuickAddType, string> = {
  client: "לקוח חדש", matter: "תיק חדש", task: "משימה חדשה", deadline: "דדליין חדש", "important-date": "תאריך חשוב חדש",
  obligation: "התחייבות חדשה ללקוח", financial: "תשלום / חיוב לקוח חדש", expense: "הוצאה חדשה", income: "הכנסה אחרת חדשה",
  trust: "פעולת נאמנות חדשה", "accounting-obligation": "התחייבות הנה״ח חדשה",
};

function needsClient(type: QuickAddType) {
  return ["matter", "obligation", "financial", "trust"].includes(type);
}
function needsMatter(type: QuickAddType) {
  return ["task", "deadline", "important-date"].includes(type);
}

export default async function QuickAddPage({ searchParams }: { searchParams: Promise<{ type?: string; clientId?: string; matterId?: string }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const params = await searchParams;
  const type = typeSchema.catch("client").parse(params.type) as QuickAddType;
  const clientId = idSchema.parse(params.clientId);
  const matterId = idSchema.parse(params.matterId);
  const [options, selectedClient] = await Promise.all([
    getAccountingFormOptions(ownerUserId),
    clientId ? getClientDetail(ownerUserId, clientId) : Promise.resolve(null),
  ]);
  const selectedMatter = options.matters.find((matter) => matter.id === matterId) ?? null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const validClient = selectedClient?.client ?? null;
  const validMatter = selectedMatter ?? null;
  const isReady = !needsClient(type) && !needsMatter(type) || (needsClient(type) && Boolean(validClient)) || (needsMatter(type) && Boolean(validMatter));
  const workDeadlines = validMatter && selectedClient?.matters.some((matter) => matter.id === validMatter.id)
    ? selectedClient.deadlines.filter((deadline) => deadline.matterId === validMatter.id).map((deadline) => ({ id: deadline.id, label: deadline.title })) : [];
  const quickForm = (() => {
    if (!isReady) return <p className="text-sm text-stone-600">בחרו {needsMatter(type) ? "תיק" : "לקוח"} כדי להמשיך.</p>;
    switch (type) {
      case "client": return <ClientForm />;
      case "matter": return validClient && <MatterForm clientId={validClient.id} minimal />;
      case "task": return validMatter && <WorkForm kind="task" matterId={validMatter.id} deadlines={workDeadlines} />;
      case "deadline": return validMatter && <WorkForm kind="deadline" matterId={validMatter.id} />;
      case "important-date": return validMatter && <WorkForm kind="importantDate" matterId={validMatter.id} />;
      case "obligation": return validClient && <ObligationForm clientId={validClient.id} matters={selectedClient?.matters ?? []} deadlines={(selectedClient?.deadlines ?? []).map((deadline) => ({ id: deadline.id, matterId: deadline.matterId, label: deadline.title }))} />;
      case "financial": return validClient && <FinancialRecordForm clientId={validClient.id} matters={selectedClient?.matters ?? []} today={today} />;
      case "expense": return <ExpenseForm today={today} />;
      case "income": return <ManualIncomeForm today={today} />;
      case "trust": return <TrustTransactionForm today={today} options={options} />;
      case "accounting-obligation": return <AccountingObligationForm />;
    }
  })();
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link className="text-sm text-teal-700 underline" href="/">לוח בקרה</Link>
    <header><h1 className="text-3xl font-bold">+ חדש</h1><p className="mt-1 text-sm text-stone-600">יצירה מהירה עם השדות הדרושים בלבד.</p></header>
    <form action="/quick-add" className={`${panelClass} grid gap-3 sm:grid-cols-2`}>
      <label>סוג רשומה<select className={inputClass} defaultValue={type} name="type">
        <optgroup label="לקוח / תיק"><option value="client">לקוח</option><option value="matter">תיק</option></optgroup>
        <optgroup label="עבודה משפטית"><option value="task">משימה</option><option value="deadline">דדליין</option><option value="important-date">תאריך חשוב</option><option value="obligation">התחייבות ללקוח</option></optgroup>
        <optgroup label="כספים"><option value="financial">תשלום / חיוב לקוח</option><option value="expense">הוצאה</option><option value="income">הכנסה אחרת</option><option value="trust">כספי נאמנות</option><option value="accounting-obligation">התחייבות הנה״ח</option></optgroup>
      </select></label>
      {needsClient(type) && <label>לקוח<select className={inputClass} defaultValue={validClient?.id ?? ""} name="clientId"><option value="">בחירת לקוח</option>{options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>}
      {needsMatter(type) && <label>תיק<select className={inputClass} defaultValue={validMatter?.id ?? ""} name="matterId"><option value="">בחירת תיק</option>{options.matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.title}</option>)}</select></label>}
      <div className="self-end"><button className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">המשך</button></div>
    </form>
    <section className={panelClass}><h2 className="text-xl font-bold">{newRecordTitles[type]}</h2>{quickForm}</section>
  </div>;
}
