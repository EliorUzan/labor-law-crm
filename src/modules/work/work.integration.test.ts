// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import postgres from "postgres";
import { getMatterDeadline, getMatterWork } from "./queries";
import { getDashboardData } from "@/modules/dashboard/queries";
import { saveDeadline, saveImportantDate } from "./actions";
import { getClientDetail } from "@/modules/clients/queries";
import { getReadOnlyTestDatabaseUrl } from "@/test/test-database";

const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: async () => "11111111-1111-4111-8111-111111111111" }));
vi.mock("@/modules/matters/queries", () => ({ getMatter: async () => ({ client: { id: "client" } }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/modules/clients/financial-summary", () => ({ getFinancialSummary: async () => ({ outstandingAmount: "0", paymentsReceivedThisMonth: "0" }) }));

// CTEs shadow every table used by the work SELECTs; no application rows are read or written.
describe.skipIf(process.env.CRM_READONLY_DB_TEST !== "1")("PostgreSQL work and Dashboard (read-only fixtures)", () => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const clientId = "22222222-2222-4222-8222-222222222222";
  const matterId = "33333333-3333-4333-8333-333333333333";
  const other = "44444444-4444-4444-8444-444444444444";
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  let connection: ReturnType<typeof postgres>;
  let clientOwner: string;
  let matterOwner: string;
  let done: boolean;
  let deadlineTime: string;
  let correctedTime: Date;
  let obligationDone: boolean;
  let sharedTask: boolean;
  const common = (n: number, rowOwner = owner, parent = matterId) => `'${id(n)}'::uuid, '${rowOwner}'::uuid, '${parent}'::uuid`;
  const stamps = "'2026-09-08'::timestamptz, '2026-09-08'::timestamptz";
  beforeAll(() => {
    connection = postgres(getReadOnlyTestDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10,
      connection: { default_transaction_read_only: true } });
    mocks.database.mockReturnValue(drizzle(async (sql, params) => {
      if (/^update "(deadlines|important_dates)"/.test(sql)) {
        // Execute only the actual UPDATE's time expression as a SELECT over one
        // synthetic timestamp. The connection forbids writes, including test writes.
        const table = sql.startsWith('update "deadlines"') ? "deadlines" : "important_dates";
        const column = table === "deadlines" ? "deadline_at" : "event_at";
        const values: string[] = [];
        const expression = sql.match(/case when[\s\S]*? end/)![0].replace(/\$(\d+)/g, (_, n: string) => {
          values.push(String(params[Number(n) - 1])); return `$${values.length}`;
        });
        const rows = await connection.unsafe(`with ${table}(${column}) as (values ('2026-10-24T23:30:00.123Z'::timestamptz))
          select ${expression} from ${table}`, values).values();
        correctedTime = rows[0][0] as Date;
        return { rows: [[id(3)]] };
      }
      if (!/from "(tasks|deadlines|important_dates|client_obligations|clients|matters)"/.test(sql)) return { rows: [] };
      const fixtures = `with
        clients(id, owner_user_id, name, phone, email, address, notes, status, created_at, updated_at) as
          (values ('${clientId}'::uuid, '${clientOwner}'::uuid, 'לקוח בדיקה', null::text, null::text, null::text, null::text, null::text, ${stamps})),
        matters(id, owner_user_id, client_id, title, status, case_number, updated_at) as
          (values ('${matterId}'::uuid, '${matterOwner}'::uuid, '${clientId}'::uuid, 'תיק בדיקה', null::text, null::text, '2026-09-08'::timestamptz)),
        deadlines(id, owner_user_id, matter_id, title, deadline_at, description, created_at, updated_at) as (values
          (${common(1)}, 'upcoming standalone', '2026-09-14T12:00:00Z'::timestamptz, null::text, ${stamps}),
          (${common(2)}, 'overdue standalone', '2026-09-07T12:00:00Z'::timestamptz, null, ${stamps}),
          (${common(3)}, 'linked', '${deadlineTime}'::timestamptz, null, ${stamps}),
          (${common(4, owner, other)}, 'other matter', '2026-09-10T12:00:00Z'::timestamptz, null, ${stamps}),
          (${common(5, other)}, 'other owner', '2026-09-10T12:00:00Z'::timestamptz, null, ${stamps})),
        tasks(id, owner_user_id, matter_id, deadline_id, title, description, done, created_at, updated_at) as (values
          (${common(11)}, null::uuid, 'no deadline', null::text, false, ${stamps}),
          (${common(12)}, '${id(3)}'::uuid, 'linked task', null, ${done}, ${stamps}),
          (${common(13)}, null, 'completed', null, true, ${stamps}),
          (${common(14, other)}, null, 'other owner task', null, false, ${stamps}),
          (${common(15, owner, other)}, null, 'other matter task', null, false, ${stamps})
          ${sharedTask ? `,(${common(16)}, '${id(3)}'::uuid, 'second linked task', null, false, ${stamps})` : ""}),
        client_obligations(id, owner_user_id, client_id, matter_id, deadline_id, title, description, due_date, done, created_at, updated_at) as (values
          ('${id(31)}'::uuid, '${owner}'::uuid, '${clientId}'::uuid, null::uuid, null::uuid, 'standalone obligation', null::text, null::date, false, ${stamps}),
          ('${id(32)}'::uuid, '${owner}'::uuid, '${clientId}'::uuid, '${matterId}'::uuid, null, 'matter-only obligation', null, null, false, ${stamps}),
          ('${id(33)}'::uuid, '${owner}'::uuid, '${clientId}'::uuid, '${matterId}'::uuid, '${id(3)}'::uuid, 'paired obligation', null, null, ${obligationDone}, ${stamps}),
          ('${id(34)}'::uuid, '${owner}'::uuid, '${clientId}'::uuid, '${matterId}'::uuid, '${id(3)}'::uuid, 'second paired obligation', null, null, false, ${stamps}),
          ('${id(35)}'::uuid, '${other}'::uuid, '${clientId}'::uuid, '${matterId}'::uuid, '${id(3)}'::uuid, 'other owner obligation', null, null, false, ${stamps}),
          ('${id(36)}'::uuid, '${owner}'::uuid, '${other}'::uuid, '${matterId}'::uuid, '${id(3)}'::uuid, 'other client obligation', null, null, false, ${stamps})),
        important_dates(id, owner_user_id, matter_id, title, event_at, type, description, created_at, updated_at) as (values
          (${common(21)}, 'future event', '2026-09-12T06:00:00Z'::timestamptz, 'hearing', null::text, ${stamps}),
          (${common(22)}, 'past event', '2026-09-01T06:00:00Z'::timestamptz, null, null, ${stamps}),
          (${common(23, other)}, 'other owner event', '2026-09-12T06:00:00Z'::timestamptz, null, null, ${stamps}),
          (${common(24, owner, other)}, 'other matter event', '2026-09-12T06:00:00Z'::timestamptz, null, null, ${stamps}))`;
      return { rows: await connection.unsafe(`${fixtures} ${sql}`, params as string[]).values() };
    }));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-08T10:00:00Z"));
  });
  beforeEach(() => { clientOwner = owner; matterOwner = owner; done = false; obligationDone = false; sharedTask = false; deadlineTime = "2026-09-10T12:00:00Z"; });
  afterAll(async () => { vi.useRealTimers(); await connection?.end({ timeout: 1 }); });

  it("orders Matter work, retains historical dates and separates open/completed Tasks", async () => {
    const result = await getMatterWork(owner, matterId);
    expect(result.tasks.map((row) => row.title)).toEqual(["linked task", "no deadline", "completed"]);
    expect(result.deadlines.map((row) => row.title)).toEqual(["overdue standalone", "linked", "upcoming standalone"]);
    expect(result.importantDates.map((row) => row.title)).toEqual(["past event", "future event"]);
  });
  it("shows standalone Deadlines, upcoming events and only open Tasks on Dashboard", async () => {
    const result = await getDashboardData(owner);
    expect(result.tasks.map((row) => row.title)).toEqual(["linked task", "no deadline"]);
    expect(result.deadlines.map((row) => row.title)).toEqual(["overdue standalone", "linked", "upcoming standalone"]);
    expect(result.deadlines.map((row) => row.isOverdue)).toEqual([true, false, false]);
    expect(result.importantDates.map((row) => row.title)).toEqual(["future event"]);
  });
  it("removes completed work from Dashboard while preserving it on Matter, and restores undone work", async () => {
    done = true;
    expect((await getDashboardData(owner)).tasks.map((row) => row.title)).toEqual(["no deadline"]);
    expect((await getMatterWork(owner, matterId)).tasks.find((row) => row.title === "linked task")?.done).toBe(true);
    done = false;
    expect((await getDashboardData(owner)).tasks.map((row) => row.title)).toContain("linked task");
  });
  it("reflects a Deadline date correction in linked Tasks on both views", async () => {
    deadlineTime = "2026-09-15T12:00:00Z";
    expect((await getMatterWork(owner, matterId)).tasks[0].deadlineAt?.toISOString()).toBe("2026-09-15T12:00:00.000Z");
    expect((await getDashboardData(owner)).tasks[0].deadlineAt?.toISOString()).toBe("2026-09-15T12:00:00.000Z");
  });
  it("accepts only Deadline IDs owned through the same Matter and Client", async () => {
    expect(await getMatterDeadline(owner, matterId, id(3))).toEqual({ id: id(3) });
    expect(await getMatterDeadline(owner, matterId, id(4))).toBeNull();
    expect(await getMatterDeadline(owner, matterId, id(5))).toBeNull();
  });
  it("reads Client and Dashboard pairings through the current Deadline and refreshes all four references", async () => {
    sharedTask = true;
    deadlineTime = "2026-09-16T09:00:00Z";
    const client = await getClientDetail(owner, clientId);
    expect(client?.obligations).toHaveLength(4);
    const linked = client!.obligations.filter((row) => row.deadlineId === id(3));
    expect(linked).toHaveLength(2);
    for (const row of linked) expect(row.deadlineAt?.toISOString()).toBe("2026-09-16T09:00:00.000Z");
    const work = await getMatterWork(owner, matterId);
    expect(work.obligations.map((row) => row.title)).toEqual(["paired obligation", "second paired obligation"]);
    const tasks = work.tasks.filter((row) => row.deadlineId === id(3));
    expect(tasks).toHaveLength(2);
    for (const row of tasks) expect(row.deadlineAt?.toISOString()).toBe("2026-09-16T09:00:00.000Z");
    const dashboard = await getDashboardData(owner);
    expect(dashboard.obligations).toHaveLength(4);
    for (const row of dashboard.obligations.filter((row) => row.deadlineId === id(3))) {
      expect(row.matterId).toBe(matterId); expect(row.matterTitle).toBe("תיק בדיקה");
      expect(row.deadlineAt?.toISOString()).toBe("2026-09-16T09:00:00.000Z");
    }
  });
  it("keeps standalone/Matter-only obligations valid and removes only completed obligations from Dashboard", async () => {
    obligationDone = true;
    const dashboard = await getDashboardData(owner);
    expect(dashboard.obligations.map((row) => row.title)).not.toContain("paired obligation");
    const standalone = dashboard.obligations.find((row) => row.title === "standalone obligation")!;
    expect(standalone.matterId).toBeNull(); expect(standalone.deadlineAt).toBeNull();
    const matterOnly = dashboard.obligations.find((row) => row.title === "matter-only obligation")!;
    expect(matterOnly.matterId).toBe(matterId); expect(matterOnly.deadlineAt).toBeNull();
    expect((await getMatterWork(owner, matterId)).obligations.find((row) => row.id === id(33))?.done).toBe(true);
  });
  it.each([
    { save: saveDeadline, field: "deadlineAt" },
    { save: saveImportantDate, field: "eventAt" },
  ])("preserves the second repeated DST instant on a $field correction, but applies an intentional time change", async ({ save, field }) => {
    const form = new FormData(); form.set("title", "תיקון כותרת"); form.set(field, "2026-10-25T01:30:00");
    expect((await save(matterId, id(3), {}, form)).success).toBeTruthy();
    expect(correctedTime.toISOString()).toBe("2026-10-24T23:30:00.123Z");
    form.set(field, "2026-10-25T03:30:00");
    expect((await save(matterId, id(3), {}, form)).success).toBeTruthy();
    expect(correctedTime.toISOString()).toBe("2026-10-25T01:30:00.000Z");
  });
  it.each(["client", "matter"])("requires %s ownership on all reads", async (parent) => {
    if (parent === "client") clientOwner = other; else matterOwner = other;
    expect(await getMatterWork(owner, matterId)).toEqual({ tasks: [], deadlines: [], importantDates: [], obligations: [] });
    const dashboard = await getDashboardData(owner);
    expect(dashboard.tasks).toEqual([]); expect(dashboard.deadlines).toEqual([]); expect(dashboard.importantDates).toEqual([]);
    expect(await getMatterDeadline(owner, matterId, id(3))).toBeNull();
  });
});
