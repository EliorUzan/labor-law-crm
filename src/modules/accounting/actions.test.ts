import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { updateAccountingLiability, updateExpense, updateLegacyAccountingRecord, updateManualIncome } from "./actions";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), database: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUserId: mocks.auth }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

const owner = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";
const execute = vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();
const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
};

beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue(owner); execute.mockReset().mockResolvedValue({ rows: [[recordId]] });
  mocks.database.mockReturnValue(drizzle(execute));
});

describe("accounting financial edits", () => {
  it.each([
    { update: updateManualIncome, table: "manual_income", values: { recordDate: "2026-09-08", description: "ייעוץ", amount: "45.50" } },
    { update: updateExpense, table: "office_expenses", values: { recordDate: "2026-09-08", description: "תוכנה", amount: "45.50" } },
    { update: updateAccountingLiability, table: "accounting_liabilities", values: { liabilityType: "tax", amount: "45.50" } },
    { update: updateLegacyAccountingRecord, table: "accounting_records", values: { type: "היסטורי", recordDate: "2026-09-08", description: "רשומה קודמת" } },
  ])("updates the displayed $table record in place", async ({ update, table, values }) => {
    expect((await update(recordId, {}, form(values as unknown as Record<string, string>))).success).toBeTruthy();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain(`update "${table}"`);
    expect(sql).toContain(`"${table}"."id" =`);
    expect(sql).toContain(`"${table}"."owner_user_id" =`);
    expect(params).toEqual(expect.arrayContaining([recordId, owner]));
    expect(mocks.revalidate).toHaveBeenCalledWith("/accounting");
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });

  it("does not report success when the same record is unavailable to the owner", async () => {
    execute.mockResolvedValue({ rows: [] });
    const state = await updateManualIncome(recordId, {}, form({ recordDate: "2026-09-08", description: "ייעוץ", amount: "45.50" }));
    expect(state.error).toBeTruthy();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
