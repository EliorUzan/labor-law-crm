import { describe, expect, it } from "vitest";

import { expenseSchema, taxPaymentSchema, trustTransactionSchema } from "./validation";

const clientId = "11111111-1111-4111-8111-111111111111";

describe("accounting validation", () => {
  it("accepts only credential-free HTTPS document links", () => {
    expect(expenseSchema.safeParse({ recordDate: "2026-09-08", description: "תוכנה", amount: "12", documentLink: "https://example.com/receipt" }).success).toBe(true);
    for (const documentLink of ["javascript:alert(1)", "data:text/html,x", "http://example.com", "https://user:pass@example.com"]) {
      expect(expenseSchema.safeParse({ recordDate: "2026-09-08", description: "תוכנה", amount: "12", documentLink }).success).toBe(false);
    }
  });

  it("keeps trust and tax amounts exact and positive", () => {
    expect(trustTransactionSchema.safeParse({ clientId, transactionType: "release", recordDate: "2026-09-08", amount: "1.2" }).data?.amount).toBe("1.20");
    expect(trustTransactionSchema.safeParse({ clientId, transactionType: "release", recordDate: "2026-09-08", amount: "0" }).success).toBe(false);
    expect(taxPaymentSchema.safeParse({ paymentKind: "vat", recordDate: "2026-09-08", amount: "-1" }).success).toBe(false);
  });
});
