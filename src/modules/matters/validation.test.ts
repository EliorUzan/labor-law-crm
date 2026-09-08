import { describe, expect, it } from "vitest";
import { historySchema, matterNoteSchema, matterSchema } from "./validation";

describe("Matter validation", () => {
  it("accepts title-only creation, trims text and normalizes every absent optional field", () => {
    const result = matterSchema.parse({ title: "  תיק חדש  " });
    expect(result.title).toBe("תיק חדש");
    for (const [field, value] of Object.entries(result)) if (field !== "title") expect(value).toBeNull();
    expect(matterSchema.parse({ title: "תיק", opposingAttorneyEmail: " " }).opposingAttorneyEmail).toBeNull();
  });
  it("discards forged identity and ownership fields", () => {
    const result = matterSchema.parse({ title: "תיק", id: "forged", ownerUserId: "forged", clientId: "forged" });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("ownerUserId");
    expect(result).not.toHaveProperty("clientId");
  });
  it.each([{}, { title: " " }, { title: "x".repeat(301) }, { title: "תיק", status: "workflow" },
    { title: "תיק", openDate: "2026-02-30" }, { title: "תיק", openDate: "0000-01-01" },
    { title: "תיק", opposingAttorneyEmail: "invalid" },
  ])("rejects invalid Matter input %j", (input) => { expect(matterSchema.safeParse(input).success).toBe(false); });
  it.each(["active", "waiting", "closed", ""])("accepts optional status %s", (status) => {
    expect(matterSchema.safeParse({ title: "תיק", status }).success).toBe(true);
  });
});

describe("Case History validation", () => {
  it("requires only title and a real calendar date; description is optional", () => {
    expect(historySchema.parse({ title: " אירוע ", eventDate: "2024-02-29" })).toEqual({ title: "אירוע", eventDate: "2024-02-29", description: null });
  });
  it.each([{ title: "אירוע" }, { eventDate: "2026-09-08", title: " " }, { title: "אירוע", eventDate: "2026-02-29" },
    { title: "אירוע", eventDate: "08.09.2026" }, { title: "אירוע", eventDate: "2026-09-08", description: "x".repeat(10001) },
  ])("rejects invalid history input %j", (input) => { expect(historySchema.safeParse(input).success).toBe(false); });
});

describe("Matter Note validation", () => {
  it("requires only non-empty content and strips forged identity fields", () => {
    expect(matterNoteSchema.parse({ content: "  הערה  ", id: "forged", matterId: "forged", ownerUserId: "forged" })).toEqual({ content: "הערה" });
  });
  it.each([{}, { content: " " }, { content: "x".repeat(10001) }])("rejects invalid note input %j", (input) => {
    expect(matterNoteSchema.safeParse(input).success).toBe(false);
  });
});
