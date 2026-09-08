import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkForm, TaskCheckbox } from "./forms";
import { MatterWorkSections } from "./matter-work";
import { Dashboard } from "@/modules/dashboard/dashboard";
import type { MatterWork } from "./queries";
import type { WorkFormState } from "./actions";

const mocks = vi.hoisted(() => ({ save: vi.fn(), toggle: vi.fn() }));
vi.mock("./actions", () => ({ saveTask: mocks.save, saveDeadline: mocks.save, saveImportantDate: mocks.save, setTaskDone: mocks.toggle }));
const matterId = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-09-08T10:00:00Z");
const common = { ownerUserId: "owner", matterId, createdAt: now, updatedAt: now, description: null };
const data: MatterWork = {
  obligations: [],
  tasks: [
    { ...common, id: "open", title: "להתקשר ללקוח", done: false, deadlineId: null, deadlineTitle: null, deadlineAt: null },
    { ...common, id: "done", title: "משימה גמורה", done: true, deadlineId: "deadline", deadlineTitle: "מועד להגשה", deadlineAt: now },
  ],
  deadlines: [{ ...common, id: "deadline", title: "מועד להגשה", deadlineAt: new Date("2026-09-01T09:00:00Z") }],
  importantDates: [{ ...common, id: "event", title: "דיון ישן", eventAt: new Date("2026-08-01T06:00:00Z"), type: "hearing" }],
};
let container: HTMLDivElement;
let root: Root | undefined;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container);
  mocks.save.mockReset(); mocks.toggle.mockReset();
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined; container.remove(); vi.unstubAllGlobals();
});

describe("work UI", () => {
  it("keeps distinct sections, historical dates and completed Tasks visible", () => {
    container.innerHTML = renderToStaticMarkup(<MatterWorkSections matterId={matterId} data={data} now={now} />);
    expect(container.querySelector("#deadlines")?.textContent).toContain("באיחור — המועד עבר");
    expect(container.querySelector("#important-dates")?.textContent).toContain("דיון ישן");
    expect(container.querySelector("#tasks")?.textContent).toContain("משימות שהושלמו");
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(container.querySelectorAll('input[type="checkbox"][checked]')).toHaveLength(1);
    for (const label of ["+ הוסף משימה", "+ הוסף דדליין", "+ הוסף תאריך חשוב"]) expect(container.textContent).toContain(label);
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
  });
  it("shows distinct real empty states", () => {
    container.innerHTML = renderToStaticMarkup(<MatterWorkSections matterId={matterId} data={{ tasks: [], deadlines: [], importantDates: [], obligations: [] }} now={now} />);
    for (const label of ["אין משימות פתוחות", "אין דדליינים בתיק", "אין תאריכים חשובים"]) expect(container.textContent).toContain(label);
  });
  it("shows multiple reverse references on Deadline cards without requiring any", () => {
    const linked = { ...data.tasks[0], deadlineId: "deadline" };
    container.innerHTML = renderToStaticMarkup(<MatterWorkSections matterId={matterId} now={now} data={{
      ...data, tasks: [linked, { ...linked, id: "second", title: "משימה שנייה" }],
      obligations: [{ id: "first-obligation", clientId: "client", deadlineId: "deadline", title: "טיוטה", done: false },
        { id: "second-obligation", clientId: "client", deadlineId: "deadline", title: "עדכון", done: true }],
    }} />);
    const card = container.querySelector("#deadline-deadline")!;
    expect(card.textContent).toContain("משימות מקושרות");
    expect(card.querySelectorAll('a[href^="#task-"]')).toHaveLength(2);
    expect(card.querySelectorAll('a[href^="/clients/client#obligation-"]')).toHaveLength(2);
    expect(card.textContent).toContain("הושלמה");
  });
  it("Task form has only a required title, optional description and same-Matter Deadline choices", () => {
    container.innerHTML = renderToStaticMarkup(<WorkForm matterId={matterId} kind="task" deadlines={[{ id: "deadline", label: "דדליין בתיק" }]} />);
    expect([...container.querySelectorAll("[name]")].map((element) => element.getAttribute("name"))).toEqual(["title", "deadlineId", "description"]);
    expect(container.querySelectorAll("[required]")).toHaveLength(1);
    expect([...container.querySelectorAll("option")].map((element) => element.value)).toEqual(["", "deadline"]);
  });
  it("date forms label Israeli time and keep optional type/description optional", () => {
    container.innerHTML = renderToStaticMarkup(<WorkForm matterId={matterId} kind="importantDate" />);
    expect(container.textContent).toContain("שעון ישראל");
    expect(container.querySelector('input[name="eventAt"]')?.getAttribute("dir")).toBe("ltr");
    expect(container.querySelector('input[name="type"]')?.hasAttribute("required")).toBe(false);
    expect(container.querySelector("textarea")?.hasAttribute("required")).toBe(false);
  });
  it.each(["task", "deadline", "importantDate"] as const)("retains %s form input after server validation failure", async (kind) => {
    mocks.save.mockImplementation(async (_matter: string, _id: string | null, _state: WorkFormState, formData: FormData) => ({
      error: "יש לתקן את השדות", values: Object.fromEntries(formData),
    }));
    root = createRoot(container);
    await act(async () => root!.render(<WorkForm matterId={matterId} kind={kind} />));
    (container.querySelector('[name="title"]') as HTMLInputElement).value = "כותרת שנשמרת";
    (container.querySelector('[name="description"]') as HTMLTextAreaElement).value = "תיאור שנשמר";
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("יש לתקן את השדות");
    expect((container.querySelector('[name="title"]') as HTMLInputElement).value).toBe("כותרת שנשמרת");
    expect((container.querySelector('[name="description"]') as HTMLTextAreaElement).value).toBe("תיאור שנשמר");
  });
  it("blocks repeated submission and clears a new form after success", async () => {
    let finish!: (state: WorkFormState) => void;
    mocks.save.mockReturnValue(new Promise<WorkFormState>((resolve) => { finish = resolve; }));
    root = createRoot(container);
    await act(async () => root!.render(<WorkForm matterId={matterId} kind="task" />));
    (container.querySelector('[name="title"]') as HTMLInputElement).value = "משימה";
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.querySelector("button")!.disabled).toBe(true);
    await act(async () => finish({ success: "המשימה נשמרה." }));
    expect(container.querySelector("button")!.disabled).toBe(false);
    expect((container.querySelector('[name="title"]') as HTMLInputElement).value).toBe("");
    expect(container.textContent).toContain("המשימה נשמרה.");
  });
  it("persists a checkbox change immediately and prevents duplicate clicks while pending", async () => {
    let resolve!: (value: { success: string }) => void;
    mocks.toggle.mockReturnValue(new Promise((done) => { resolve = done; }));
    root = createRoot(container);
    await act(async () => root!.render(<TaskCheckbox matterId={matterId} taskId="task" done={false} title="משימה" />));
    await act(async () => container.querySelector("input")!.click());
    expect(mocks.toggle).toHaveBeenCalledWith(matterId, "task", true);
    expect(container.querySelector("input")!.checked).toBe(true);
    expect(container.querySelector("input")!.disabled).toBe(true);
    await act(async () => {
      root!.render(<TaskCheckbox matterId={matterId} taskId="task" done title="משימה" />);
      resolve({ success: "נשמר" });
    });
    expect(container.querySelector("input")!.checked).toBe(true);
    expect(container.querySelector("input")!.disabled).toBe(false);
  });
  it("rolls the checkbox back and announces a save failure", async () => {
    mocks.toggle.mockResolvedValue({ error: "שמירה נכשלה" });
    root = createRoot(container);
    await act(async () => root!.render(<TaskCheckbox matterId={matterId} taskId="task" done={false} title="משימה" />));
    await act(async () => container.querySelector("input")!.click());
    expect(container.querySelector("input")!.checked).toBe(false);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("שמירה נכשלה");
  });
  it("links Dashboard work to the correct Matter section and translates event types", () => {
    container.innerHTML = renderToStaticMarkup(<Dashboard data={{
      generatedAt: now, financialSummary: { outstandingAmount: "0", paymentsReceivedThisMonth: "0" }, recentMatters: [], obligations: [],
      tasks: [{ id: "task", matterId, title: "משימה פתוחה", matterTitle: "תיק", deadlineAt: now, deadlineTitle: "דדליין" }],
      deadlines: [{ id: "deadline", matterId, title: "מועד", matterTitle: "תיק", deadlineAt: now, isOverdue: true }],
      importantDates: [{ id: "event", matterId, title: "אירוע", matterTitle: "תיק", eventAt: now, type: "mediation" }],
    }} />);
    for (const section of ["tasks", "deadlines", "important-dates"]) expect(container.querySelector(`a[href="/matters/${matterId}#${section}"]`)).not.toBeNull();
    expect(container.textContent).toContain("גישור");
    expect(container.textContent).toContain("באיחור");
  });
});
