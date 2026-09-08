import { describe, expect, it } from "vitest";
import { amountSchema, calendarDateSchema, clientSchema, financialRecordSchema, obligationSchema, obligationCompletionSchema } from "./validation";

const clientId = "11111111-1111-4111-8111-111111111111";

describe("client input", () => {
  it("accepts only a name, trims it, and stores optional blanks as null", () => {
    expect(clientSchema.parse({ name: "  ישראל ישראלי  ", phone: "  ", status: "" })).toEqual({
      name: "ישראל ישראלי", phone: null, email: null, address: null, notes: null, status: null,
    });
  });
  it("rejects empty names, invalid emails, invalid status and uploaded files", () => {
    for (const value of [{ name: " " }, { name: "שם", email: "wrong" }, { name: "שם", status: "admin" }, { name: "שם", phone: new File([], "phone") }]) {
      expect(clientSchema.safeParse(value).success).toBe(false);
    }
  });
  it("never accepts identity or owner fields in an update payload", () => {
    const result = clientSchema.parse({ name: "שם", id: clientId, ownerUserId: clientId, israeliId: "123456789" });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("ownerUserId");
    expect(result).not.toHaveProperty("israeliId");
  });
});

describe("exact financial input", () => {
  it.each([ ["0001.2", "1.20"], ["0.01", "0.01"], ["999999999999.99", "999999999999.99"], [" 12 ", "12.00"] ])("normalizes %s exactly", (input, expected) => {
    expect(amountSchema.parse(input)).toBe(expected);
  });
  it.each(["0", "0.00", "-1", "1.001", "1e3", "NaN", "Infinity", "1,000", "1000000000000", "", ".5"])("rejects %s rather than rounding", (input) => {
    expect(amountSchema.safeParse(input).success).toBe(false);
  });
  it.each(["fee", "charge", "payment"])("accepts the existing %s type without a Matter", (type) => {
    expect(financialRecordSchema.parse({ clientId, type, amount: "1.01", recordDate: "2026-09-08" }).matterId).toBeNull();
  });
  it.each(["2026-02-29", "2026-04-31", "0000-01-01", "2026-13-01", "2026-09-08T12:00:00Z"])("rejects invalid date %s", (value) => {
    expect(calendarDateSchema.safeParse(value).success).toBe(false);
  });
  it("accepts leap days", () => expect(calendarDateSchema.parse("2028-02-29")).toBe("2028-02-29"));
});

describe("obligation input", () => {
  it("requires only title and client, and does not accept workflow/completion on creation", () => {
    const result = obligationSchema.parse({ clientId, title: " לחזור ללקוח ", done: true, priority: "high" });
    expect(result).toEqual({ clientId, title: "לחזור ללקוח", matterId: null, description: null, dueDate: null });
  });
  it("parses both completion states explicitly (false must not coerce to true)", () => {
    expect(obligationCompletionSchema.parse({ clientId, obligationId: clientId, done: "false" }).done).toBe(false);
    expect(obligationCompletionSchema.parse({ clientId, obligationId: clientId, done: "true" }).done).toBe(true);
    expect(obligationCompletionSchema.safeParse({ clientId, obligationId: clientId, done: "pending" }).success).toBe(false);
  });
});
