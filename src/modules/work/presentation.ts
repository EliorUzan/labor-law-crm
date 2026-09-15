export type ImportantDateTypeOption = { key: string; label: string; color: string; isActive?: boolean };

export const defaultImportantDateTypes: ImportantDateTypeOption[] = [
  { key: "courtDiscussion", label: "דיון", color: "#7c3aed" },
  { key: "submissionDeadline", label: "דדליין להגשה", color: "#2563eb" },
  { key: "counterSubmissionDeadline", label: "דדליין להגשות של צד שני", color: "#ea580c" },
  { key: "meeting", label: "פגישה", color: "#059669" },
];

export const importantDateTypes: Record<string, string> = Object.fromEntries(
  defaultImportantDateTypes.map((type) => [type.key, type.label]),
);
// Legacy values remain readable for records created before the typed calendar.
Object.assign(importantDateTypes, { hearing: "דיון", mediation: "גישור", meeting: "פגישה", other: "אחר" });

export function importantDateTypeLabel(type: string | null): string | null {
  return type ? importantDateTypes[type] ?? type : null;
}

export function importantDateTypeColor(type: string | null, options: readonly ImportantDateTypeOption[] = defaultImportantDateTypes): string {
  return options.find((option) => option.key === type)?.color ?? "#64748b";
}
