import { describe, expect, it } from "vitest";

import {
  accountingRecords,
  clientObligations,
  clients,
  deadlines,
  documentReferences,
  financialRecords,
  importantDates,
  matterHistory,
  matters,
  tasks,
} from "./schema";

describe("V1 schema", () => {
  it("gives every application table an owner UUID and audit timestamps", () => {
    const tables = [
      clients,
      clientObligations,
      financialRecords,
      matters,
      matterHistory,
      deadlines,
      tasks,
      importantDates,
      documentReferences,
      accountingRecords,
    ];

    for (const table of tables) {
      expect(table).toHaveProperty("ownerUserId");
      expect(table).toHaveProperty("createdAt");
      expect(table).toHaveProperty("updatedAt");
    }
  });

  it("keeps tasks, deadlines, and important dates distinct", () => {
    expect(tasks).toHaveProperty("deadlineId");
    expect(tasks).not.toHaveProperty("dueDate");
    expect(deadlines).not.toHaveProperty("taskId");
    expect(importantDates).toHaveProperty("eventAt");
  });
});
