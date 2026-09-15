import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { createDatabaseClient } from "@/db/client";
import { importantDateTypeRecords } from "@/db/schema";
import { defaultImportantDateTypes, type ImportantDateTypeOption } from "./presentation";

export async function getImportantDateTypes(ownerUserId: string): Promise<ImportantDateTypeOption[]> {
  let rows: Array<{ key: string; label: string; color: string; isActive: boolean }>;
  try {
    rows = await createDatabaseClient().select({
      key: importantDateTypeRecords.key,
      label: importantDateTypeRecords.label,
      color: importantDateTypeRecords.color,
      isActive: importantDateTypeRecords.isActive,
    }).from(importantDateTypeRecords)
      .where(eq(importantDateTypeRecords.ownerUserId, ownerUserId))
      .orderBy(asc(importantDateTypeRecords.createdAt));
  } catch (error) {
    // The calendar migration may be applied after the application deploy. Keep
    // the dashboard usable with built-in types during that short rollout gap.
    if (!isMissingCalendarSchema(error)) throw error;
    rows = [];
  }
  const saved = new Map(rows.map((row) => [row.key, row]));
  const defaults = defaultImportantDateTypes.filter((type) => saved.get(type.key)?.isActive !== false)
    .map((type) => saved.get(type.key) ?? type);
  return [...defaults, ...rows.filter((row) => !defaultImportantDateTypes.some((type) => type.key === row.key) && row.isActive)];
}

function isMissingCalendarSchema(error: unknown) {
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = candidate?.code ?? candidate?.cause?.code;
  const message = `${candidate?.message ?? ""} ${candidate?.cause?.message ?? ""}`;
  return code === "42P01" || code === "42703" || /important_date_types|deadlines.*type|column .*type.*does not exist/i.test(message);
}

export async function isActiveImportantDateType(ownerUserId: string, key: string | null): Promise<boolean> {
  if (!key) return true;
  const [row] = await createDatabaseClient().select({ isActive: importantDateTypeRecords.isActive })
    .from(importantDateTypeRecords)
    .where(and(eq(importantDateTypeRecords.ownerUserId, ownerUserId), eq(importantDateTypeRecords.key, key)));
  // Defaults are active unless the user has explicitly archived them. Custom
  // types must have an active persisted row.
  return defaultImportantDateTypes.some((type) => type.key === key) ? row?.isActive ?? true : row?.isActive === true;
}
