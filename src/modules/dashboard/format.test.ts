import { describe, expect, it } from "vitest";

import {
  formatIsraeliDate,
  formatIsraeliShekels,
  getJerusalemMonthRange,
  orderTasksByDeadline,
} from "./format";

describe("dashboard formatting", () => {
  it("formats exact database decimal values without losing fractional cents", () => {
    expect(formatIsraeliShekels("999999999999.99")).toContain(".99 ₪");
    expect(formatIsraeliShekels("125")).toMatch(/125.00 ₪$/);
  });

  it("keeps date-only values on their stored Israeli calendar date", () => {
    expect(formatIsraeliDate("2026-09-08")).toBe("08.09.2026");
  });

  it("uses the Israeli calendar month for financial boundaries", () => {
    expect(getJerusalemMonthRange(new Date("2026-12-31T22:30:00.000Z"))).toEqual({
      monthStart: "2027-01-01",
      nextMonthStart: "2027-02-01",
    });
  });

  it("places tasks with the nearest linked deadline before undated tasks", () => {
    const tasks = [
      { title: "ללא דדליין", deadlineAt: null },
      { title: "מאוחר", deadlineAt: new Date("2026-09-12T08:00:00.000Z") },
      { title: "מוקדם", deadlineAt: new Date("2026-09-10T08:00:00.000Z") },
    ];

    expect(orderTasksByDeadline(tasks).map((task) => task.title)).toEqual([
      "מוקדם",
      "מאוחר",
      "ללא דדליין",
    ]);
  });
});
