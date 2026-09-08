import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientDetailView } from "./client-detail";
import { ClientForm, FinancialRecordForm } from "./forms";
import type { ClientDetail } from "./queries";
import type { ClientFormState } from "./actions";

const mock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./actions", () => ({ createClient: mock.save, updateClient: mock.save, addFinancialRecord: mock.save,
  addObligation: mock.save, updateObligation: mock.save, setObligationCompletion: mock.save }));
const clientId = "22222222-2222-4222-8222-222222222222";
const data: ClientDetail = {
  client: { id: clientId, ownerUserId: clientId, name: "ישראל ישראלי", phone: null, email: null, address: null, notes: null, status: null,
    createdAt: new Date(), updatedAt: new Date() },
  matters: [], records: [], obligations: [], deadlines: [],
  financialSummary: { totalCharges: "0", totalPayments: "0", outstandingAmount: "0", paymentsReceivedThisMonth: "0" },
};
let container: HTMLDivElement;
let root: Root | undefined;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  mock.save.mockReset();
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  container.remove();
  vi.unstubAllGlobals();
});

describe("Client presentation", () => {
  it("hides absent contact fields and provides a real Matters empty state", () => {
    container.innerHTML = renderToStaticMarkup(<ClientDetailView data={data} today="2026-09-08" />);
    expect(container.textContent).not.toContain("פרטי לקוח");
    expect(container.textContent).not.toContain("דוא״ל");
    expect(container.textContent).toContain("אין תיקים ללקוח זה");
    expect(container.querySelector('select[name="matterId"]')).toBeNull();
    expect(container.querySelector(`a[href="/clients/${clientId}/matters/new"]`)?.textContent).toBe("+ תיק חדש");
  });
  it("shows only supplied details with isolated LTR email/phone", () => {
    container.innerHTML = renderToStaticMarkup(<ClientDetailView data={{ ...data, client: { ...data.client, phone: "050-1234567", email: "test@example.com" } }} today="2026-09-08" />);
    const details = container.querySelector("section")!;
    expect(details.textContent).toContain("050-1234567");
    expect(details.textContent).not.toContain("כתובת");
    expect(details.querySelectorAll('bdi[dir="ltr"]')).toHaveLength(2);
  });
  it("keeps completed obligations collapsed and identifies a small credit", () => {
    container.innerHTML = renderToStaticMarkup(<ClientDetailView today="2026-09-08" data={{ ...data,
      financialSummary: { ...data.financialSummary, outstandingAmount: "-0.01" },
      obligations: [{ id: clientId, title: "הושלמה", description: null, dueDate: null, done: true, matterId: null, deadlineId: null, deadlineTitle: null, deadlineAt: null, deadlineMatterId: null, deadlineMatterTitle: null, updatedAt: new Date() }],
    }} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.closest("details")?.hasAttribute("open")).toBe(false);
    expect(container.textContent).toContain("יתרת זכות");
    expect(container.textContent).toContain("-0.01 ₪");
  });
});

describe("form feedback", () => {
  it("preserves entered values after server validation rejects a client", async () => {
    mock.save.mockImplementation(async (_state: ClientFormState, formData: FormData) => ({
      error: "דוא״ל לא תקין", values: Object.fromEntries(formData),
    }));
    root = createRoot(container);
    await act(async () => root!.render(<ClientForm />));
    (container.querySelector('[name="name"]') as HTMLInputElement).value = "שם שנשמר בטופס";
    (container.querySelector('[name="email"]') as HTMLInputElement).value = "invalid-email";
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("דוא״ל לא תקין");
    expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe("שם שנשמר בטופס");
    expect((container.querySelector('[name="email"]') as HTMLInputElement).value).toBe("invalid-email");
  });
  it("disables repeat submission while saving and clears the amount on success", async () => {
    let finish: (state: ClientFormState) => void = () => {};
    mock.save.mockReturnValue(new Promise<ClientFormState>((resolve) => { finish = resolve; }));
    root = createRoot(container);
    await act(async () => root!.render(<FinancialRecordForm clientId={clientId} matters={[]} today="2026-09-08" />));
    (container.querySelector('[name="amount"]') as HTMLInputElement).value = "100.20";
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.querySelector("button")?.disabled).toBe(true);
    await act(async () => finish({ success: "נשמר" }));
    expect(container.querySelector("button")?.disabled).toBe(false);
    expect((container.querySelector('[name="amount"]') as HTMLInputElement).value).toBe("");
    expect(container.textContent).toContain("נשמר");
  });
});
