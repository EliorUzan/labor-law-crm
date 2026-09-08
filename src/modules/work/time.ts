import { JERUSALEM_TIME_ZONE } from "@/modules/dashboard/format";

/** A datetime-local field always represents Israeli wall time, never browser time. */
export function toJerusalemInput(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JERUSALEM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(value);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}

/** Returns the Israeli calendar date represented by an instant. */
export function toJerusalemDate(value: Date): string {
  return toJerusalemInput(value).slice(0, 10);
}

/** Reject nonexistent DST times. For a repeated hour, use its first occurrence. */
export function fromJerusalemInput(value: string): Date | null {
  const normalized = value.length === 16 ? `${value}:00` : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) return null;
  const wall = Date.parse(`${normalized}Z`);
  if (!Number.isFinite(wall)) return null;
  const offsets = new Set<number>();
  for (const hours of [-24, 0, 24]) {
    const probe = wall + hours * 3600000;
    offsets.add(Date.parse(`${toJerusalemInput(new Date(probe))}Z`) - probe);
  }
  const candidates = [...offsets].map((offset) => new Date(wall - offset))
    .filter((candidate) => toJerusalemInput(candidate) === normalized)
    .sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] ?? null;
}

export function isDeadlineOverdue(deadlineAt: Date, now: Date): boolean {
  return deadlineAt.getTime() < now.getTime();
}
