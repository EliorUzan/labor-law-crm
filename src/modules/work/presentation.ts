export const importantDateTypes: Record<string, string> = {
  hearing: "דיון", meeting: "פגישה", mediation: "גישור", other: "אחר",
};

export function importantDateTypeLabel(type: string | null): string | null {
  return type ? importantDateTypes[type] ?? type : null;
}
