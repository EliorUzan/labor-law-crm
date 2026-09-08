import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObligationForm } from "./forms";
import { ClientDetailView } from "./client-detail";
import type { ClientDetail } from "./queries";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./actions", () => ({ createClient: mocks.save, updateClient: mocks.save, addFinancialRecord: mocks.save,
  addObligation: mocks.save, updateObligation: mocks.save, setObligationCompletion: mocks.save }));
const matters = [{ id: "matter-a", title: "תיק א" }, { id: "matter-b", title: "תיק ב" }];
const deadlines = [{ id: "deadline-a", matterId: "matter-a", label: "דדליין א" }, { id: "deadline-b", matterId: "matter-b", label: "דדליין ב" }];
let root: Root | undefined;
let container: HTMLDivElement;
const select = (name: string) => container.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
const change = async (name: string, value: string) => {
  await act(async () => { select(name).value = value; select(name).dispatchEvent(new Event("change", { bubbles: true })); });
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container);
  mocks.save.mockReset().mockResolvedValue({ success: "נשמר" });
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined; container.remove(); vi.unstubAllGlobals();
});
describe("Obligation pairing controls", () => {
  it("lists Client Deadlines without a Matter and filters choices when Matter changes", async () => {
    root = createRoot(container);
    await act(async () => root!.render(<ObligationForm clientId="client" matters={matters} deadlines={deadlines} />));
    expect(select("deadlineId").disabled).toBe(false);
    expect([...select("deadlineId").options].map((option) => option.value)).toEqual(["", "deadline-a", "deadline-b"]);
    await change("matterId", "matter-a");
    expect(select("deadlineId").disabled).toBe(false);
    expect([...select("deadlineId").options].map((option) => option.value)).toEqual(["", "deadline-a"]);
    await change("deadlineId", "deadline-a");
    expect(container.querySelector('[name="dueDate"]')).toBeNull();
    await change("matterId", "matter-b");
    expect(select("deadlineId").value).toBe("");
    expect([...select("deadlineId").options].map((option) => option.value)).toEqual(["", "deadline-b"]);
    await change("deadlineId", "deadline-b");
    await change("matterId", "");
    expect(select("deadlineId").value).toBe("");
    expect([...select("deadlineId").options].map((option) => option.value)).toEqual(["", "deadline-a", "deadline-b"]);
  });
  it("edits and unpairs while keeping Matter, then submits the cleared relationship", async () => {
    root = createRoot(container);
    await act(async () => root!.render(<ObligationForm clientId="client" obligationId="obligation" matters={matters} deadlines={deadlines}
      initial={{ title: "טיוטה", description: null, dueDate: null, matterId: "matter-a", deadlineId: "deadline-a" }} />));
    expect(select("deadlineId").value).toBe("deadline-a");
    await change("deadlineId", "");
    expect(select("matterId").value).toBe("matter-a");
    await act(async () => container.querySelector("form")!.requestSubmit());
    const form = mocks.save.mock.calls[0][3] as FormData;
    expect(form.get("matterId")).toBe("matter-a"); expect(form.get("deadlineId")).toBe("");
  });
  it("retains pairing and title after failed save and resets both selectors after successful creation", async () => {
    mocks.save.mockImplementationOnce(async (_client, _state, form: FormData) => ({ error: "שגיאה", values: Object.fromEntries(form) }));
    root = createRoot(container);
    await act(async () => root!.render(<ObligationForm clientId="client" matters={matters} deadlines={deadlines} />));
    (container.querySelector('[name="title"]') as HTMLInputElement).value = "טיוטה";
    await change("matterId", "matter-a"); await change("deadlineId", "deadline-a");
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.textContent).toContain("שגיאה");
    expect(await mocks.save.mock.results[0].value).toMatchObject({ values: { matterId: "matter-a", deadlineId: "deadline-a" } });
    expect(select("deadlineId").disabled).toBe(false);
    expect(select("matterId").value).toBe("matter-a"); expect(select("deadlineId").value).toBe("deadline-a");
    expect((container.querySelector('[name="title"]') as HTMLInputElement).value).toBe("טיוטה");
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(select("matterId").value).toBe(""); expect(select("deadlineId").value).toBe("");
  });
  it("shows the Deadline's Matter when an obligation did not select one", () => {
    const now = new Date("2026-09-08T10:00:00Z");
    const data: ClientDetail = {
      client: { id: "client", ownerUserId: "owner", name: "לקוח", phone: null, email: null, address: null, notes: null, status: null, createdAt: now, updatedAt: now },
      matters: matters.map((matter) => ({ ...matter, status: null, caseNumber: null })), records: [], deadlines: [],
      financialSummary: { totalCharges: "0", totalPayments: "0", outstandingAmount: "0", paymentsReceivedThisMonth: "0" },
      obligations: [{ id: "obligation", title: "טיוטה לאישור", matterId: null, deadlineMatterId: "matter-a", deadlineMatterTitle: "תיק א", deadlineId: "deadline-a", deadlineTitle: "מועד הגשה",
        deadlineAt: new Date("2026-09-16T09:00:00Z"), description: null, dueDate: null, done: false, updatedAt: now }],
    };
    container.innerHTML = renderToStaticMarkup(<ClientDetailView data={data} today="2026-09-08" />);
    const row = container.querySelector("#obligation-obligation")!;
    expect(row.querySelector('a[href="/matters/matter-a"]')?.textContent).toBe("תיק א");
    expect(row.querySelector('a[href="/matters/matter-a#deadline-deadline-a"]')?.textContent).toContain("16.09.2026");
    expect(row.textContent).toContain("עריכת התחייבות");
  });
});
