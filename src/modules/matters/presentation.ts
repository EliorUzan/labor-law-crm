export const matterStatusLabels = { active: "פעיל", waiting: "בהמתנה", closed: "נסגר" };

// Preserve display of legacy free-text statuses without silently rewriting records.
export function matterStatusLabel(status: string | null) {
  return status && (Object.hasOwn(matterStatusLabels, status) ? matterStatusLabels[status as keyof typeof matterStatusLabels] : status);
}
