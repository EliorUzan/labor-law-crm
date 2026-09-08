import { describe, expect, it } from "vitest";
import { deadlineSchema, importantDateSchema, taskSchema, workTimeSchema } from "./validation";
import { fromJerusalemInput, isDeadlineOverdue, toJerusalemInput } from "./time";
import { formatIsraeliDate } from "@/modules/dashboard/format";
import { getTableColumns } from "drizzle-orm";
import { tasks, deadlines } from "@/db/schema";

describe("minimal work input", () => {
  it("creates a Task with only a title and no independent due date", () => {
    expect(taskSchema.parse({ title: " להתקשר ללקוח ", dueDate: "2026-09-14", done: true, priority: "high" }))
      .toEqual({ title: "להתקשר ללקוח", description: null, deadlineId: null });
    expect(getTableColumns(tasks)).not.toHaveProperty("dueDate");
    expect(getTableColumns(deadlines)).not.toHaveProperty("taskId");
  });
  it("allows clearing optional task fields and linking a Deadline UUID", () => {
    const deadlineId = "44444444-4444-4444-8444-444444444444";
    expect(taskSchema.parse({ title: "משימה", description: " ", deadlineId }).deadlineId).toBe(deadlineId);
    expect(taskSchema.parse({ title: "משימה", deadlineId: "" }).deadlineId).toBeNull();
    expect(taskSchema.safeParse({ title: "משימה", deadlineId: "bad" }).success).toBe(false);
  });
  it("creates standalone Deadlines with a date and default 17:00 Israel time", () => {
    expect(deadlineSchema.parse({ title: "הגשה", deadlineDate: "2026-09-14", taskId: "ignored" }))
      .toEqual({ title: "הגשה", deadlineAt: new Date("2026-09-14T14:00:00Z"), description: null });
    expect(deadlineSchema.parse({ title: "הגשה", deadlineDate: "2026-09-14", deadlineTime: "23:59" }).deadlineAt)
      .toEqual(new Date("2026-09-14T20:59:00Z"));
  });
  it("creates Important Dates with optional free-text type", () => {
    expect(importantDateSchema.parse({ title: "דיון", eventAt: "2026-09-14T09:00", type: "סוג מותאם" }).type).toBe("סוג מותאם");
    expect(importantDateSchema.parse({ title: "דיון", eventAt: "2026-09-14T09:00" }).type).toBeNull();
  });
  it("rejects blank titles, impossible dates and oversized fields", () => {
    expect(taskSchema.safeParse({ title: " " }).success).toBe(false);
    expect(taskSchema.safeParse({ title: "x".repeat(301) }).success).toBe(false);
    expect(taskSchema.safeParse({ title: "x", description: "x".repeat(10001) }).success).toBe(false);
    for (const time of ["2026-02-30T10:00", "0000-01-01T10:00", "2026-09-14", "2026-09-14T25:00", "2026-09-14T10:00Z"])
      expect(workTimeSchema.safeParse(time).success, time).toBe(false);
  });
});

describe("Israeli date/time semantics", () => {
  it.each([
    ["2026-09-14T00:15", "2026-09-13T21:15:00Z"],
    ["2026-01-14T00:15", "2026-01-13T22:15:00Z"],
    ["2026-09-14T14:12:34", "2026-09-14T11:12:34Z"],
  ])("round-trips %s in Jerusalem regardless of browser timezone", (wall, utc) => {
    const result = fromJerusalemInput(wall)!;
    expect(result.toISOString()).toBe(new Date(utc).toISOString());
    expect(toJerusalemInput(result)).toBe(wall.length === 16 ? wall + ":00" : wall);
  });
  it("rejects the spring DST gap and consistently selects the first repeated autumn hour", () => {
    expect(workTimeSchema.safeParse("2026-03-27T02:30").success).toBe(false);
    expect(fromJerusalemInput("2026-10-25T01:30")?.toISOString()).toBe("2026-10-24T22:30:00.000Z");
  });
  it("classifies overdue at the exact instant and keeps legal date-only values unchanged", () => {
    const now = new Date("2026-09-14T12:00:00Z");
    expect(isDeadlineOverdue(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isDeadlineOverdue(now, now)).toBe(false);
    expect(isDeadlineOverdue(new Date(now.getTime() + 1), now)).toBe(false);
    expect(formatIsraeliDate("2026-09-14")).toBe("14.09.2026");
  });
});
