import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatterDetailView } from "./matter-detail";
import { MatterForm, HistoryForm, MatterNoteForm } from "./forms";
import { Dashboard } from "@/modules/dashboard/dashboard";
import type { MatterDetail } from "./queries";
import type { MatterFormState } from "./actions";

const mock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./actions", () => ({ createMatter: mock.save, updateMatter: mock.save, saveHistoryEntry: mock.save, saveMatterNote: mock.save }));
const clientId = "22222222-2222-4222-8222-222222222222";
const matterId = "33333333-3333-4333-8333-333333333333";
const data: MatterDetail = {
  client: { id: clientId, name: "לקוח בדיקה" }, history: [], notes: [],
  matter: { id: matterId, clientId, ownerUserId: clientId, title: "תיק בדיקה", caseType: null, status: null,
    openDate: null, caseNumber: null, courtOrTribunal: null, opposingParty: null, opposingAttorneyName: null,
    opposingAttorneyPhone: null, opposingAttorneyEmail: null, opposingAttorneyFirm: null,
    createdAt: new Date(), updatedAt: new Date() },
};
let container: HTMLDivElement;
let root: Root | undefined;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container); mock.save.mockReset();
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined; container.remove(); vi.unstubAllGlobals();
});

describe("Matter presentation", () => {
  it("hides empty details and attorney sections and never displays internal UUIDs", () => {
    container.innerHTML = renderToStaticMarkup(<MatterDetailView data={data} today="2026-09-08" />);
    for (const absent of ["פרטי תיק", "עורך דין בצד שכנגד", "מספר תיק", matterId, clientId]) expect(container.textContent).not.toContain(absent);
    expect(container.querySelector(`a[href="/clients/${clientId}"]`)?.textContent).toBe("לקוח בדיקה");
    expect(container.textContent).toContain("+ הוסף הערה");
    expect(container.textContent).toContain("+ הוסף אירוע להיסטוריה");
  });
  it("shows supplied fields, Hebrew status, LTR email/phone and a plain-text note", () => {
    container.innerHTML = renderToStaticMarkup(<MatterDetailView today="2026-09-08" data={{ ...data,
      matter: { ...data.matter, status: "waiting", opposingAttorneyEmail: "test@example.com", opposingAttorneyPhone: "050-1234567" },
      notes: [{ id: "note", content: "<script>test</script>\nשורה שנייה", createdAt: new Date("2026-09-08T10:15:00Z") }],
    }} />);
    expect(container.textContent).toContain("בהמתנה");
    expect(container.querySelectorAll('bdi[dir="ltr"]')).toHaveLength(2);
    expect(container.querySelector("#notes p")?.textContent).toBe("<script>test</script>\nשורה שנייה");
    expect(container.querySelector("#notes script")).toBeNull();
    expect(container.textContent).not.toContain("בית דין / ערכאה");
  });
  it("displays history oldest to newest with dates and optional descriptions, and collapsed corrections", () => {
    container.innerHTML = renderToStaticMarkup(<MatterDetailView today="2026-09-08" data={{ ...data, history: [
      { id: "old", eventDate: "2026-08-28", title: "ישן", description: null },
      { id: "new", eventDate: "2026-09-07", title: "חדש", description: "תיאור" },
    ] }} />);
    expect([...container.querySelectorAll("#history ol time")].map((element) => element.textContent)).toEqual(["28.08.2026", "07.09.2026"]);
    expect(container.querySelectorAll("#history ol p")).toHaveLength(1);
    expect(container.querySelector("ol details")?.hasAttribute("open")).toBe(false);
  });
  it("displays distinct notes newest to oldest by their creation timestamp", () => {
    container.innerHTML = renderToStaticMarkup(<MatterDetailView today="2026-09-08" data={{ ...data, notes: [
      { id: "new", content: "הערה חדשה", createdAt: new Date("2026-09-08T10:15:00Z") },
      { id: "old", content: "הערה ישנה", createdAt: new Date("2026-09-07T16:40:00Z") },
    ] }} />);
    expect([...container.querySelectorAll("#notes ol p")].map((element) => element.textContent)).toEqual(["הערה חדשה", "הערה ישנה"]);
    expect(container.textContent).toContain("08.09.2026");
    expect(container.textContent).toContain("07.09.2026");
  });
  it("links recent Dashboard Matters to the detail page with Hebrew status", () => {
    container.innerHTML = renderToStaticMarkup(<Dashboard data={{ generatedAt: new Date(), deadlines: [], tasks: [], importantDates: [], obligations: [],
      recentMatters: [{ id: matterId, title: "תיק בדיקה", clientName: "לקוח", status: "closed" }],
      financialSummary: { outstandingAmount: "0", paymentsReceivedThisMonth: "0" },
    }} />);
    expect(container.querySelector(`a[href="/matters/${matterId}"]`)?.textContent).toBe("תיק בדיקה");
    expect(container.textContent).toContain("נסגר");
  });
});

describe("Matter forms", () => {
  it("requires only title and does not expose editable identity or ownership", () => {
    container.innerHTML = renderToStaticMarkup(<MatterForm clientId={clientId} />);
    expect([...container.querySelectorAll("[required]")].map((element) => element.getAttribute("name"))).toEqual(["title"]);
    for (const field of ["id", "clientId", "ownerUserId"]) expect(container.querySelector(`[name="${field}"]`)).toBeNull();
  });
  it("retains Matter fields after validation failure", async () => {
    mock.save.mockImplementation(async (_clientId: string, _state: MatterFormState, formData: FormData) => ({ error: "דוא״ל לא תקין", values: Object.fromEntries(formData) }));
    root = createRoot(container); await act(async () => root!.render(<MatterForm clientId={clientId} />));
    (container.querySelector('[name="title"]') as HTMLInputElement).value = "תיק שנשמר בטופס";
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("דוא״ל לא תקין");
    expect((container.querySelector('[name="title"]') as HTMLInputElement).value).toBe("תיק שנשמר בטופס");
  });
  it("has a content-only note form and retains note text after validation failure", async () => {
    mock.save.mockImplementation(async (_matterId: string, _noteId: string | null, _state: MatterFormState, formData: FormData) => ({ error: "יש להזין תוכן להערה.", values: Object.fromEntries(formData) }));
    root = createRoot(container); await act(async () => root!.render(<MatterNoteForm matterId={matterId} />));
    expect([...container.querySelectorAll("[required]")].map((element) => element.getAttribute("name"))).toEqual(["content"]);
    (container.querySelector('[name="content"]') as HTMLTextAreaElement).value = "הערה שנשמרה בטופס";
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect((container.querySelector('[name="content"]') as HTMLTextAreaElement).value).toBe("הערה שנשמרה בטופס");
  });
  it("disables repeat history submission and clears new-entry fields on success", async () => {
    let finish: (state: MatterFormState) => void = () => {};
    mock.save.mockReturnValue(new Promise<MatterFormState>((resolve) => { finish = resolve; }));
    root = createRoot(container); await act(async () => root!.render(<HistoryForm matterId={matterId} today="2026-09-08" />));
    (container.querySelector('[name="title"]') as HTMLInputElement).value = "אירוע";
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.querySelector("button")?.disabled).toBe(true);
    await act(async () => finish({ success: "האירוע נוסף" }));
    expect(container.querySelector("button")?.disabled).toBe(false);
    expect((container.querySelector('[name="title"]') as HTMLInputElement).value).toBe("");
    expect(container.textContent).toContain("האירוע נוסף");
  });
});
