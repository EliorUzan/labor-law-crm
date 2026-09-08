export const JERUSALEM_TIME_ZONE = "Asia/Jerusalem";

type DatedTask = {
  deadlineAt: Date | null;
};

const exactDecimalPattern = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** Formats a Postgres numeric value without converting the decimal to a JavaScript number. */
export function formatIsraeliShekels(amount: string): string {
  const match = exactDecimalPattern.exec(amount);

  if (!match) {
    throw new Error("Expected an exact decimal amount from the database.");
  }

  const [, sign, whole, decimal = ""] = match;
  const wholeNumber = BigInt(`${sign}${whole}`);
  const formatter = new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
  const decimalSeparator = new Intl.NumberFormat("he-IL")
    .formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value ?? ".";

  return `${formatter.format(wholeNumber)}${decimalSeparator}${decimal.padEnd(2, "0")} ₪`;
}

/** Formats a timestamp for Israeli users while retaining the timestamp's instant. */
export function formatIsraeliDateTime(value: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: JERUSALEM_TIME_ZONE,
    year: "numeric",
  }).format(value);
}

/** Formats a Postgres date-only value without passing it through a timezone. */
export function formatIsraeliDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("Expected a date-only value in YYYY-MM-DD format.");
  }

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

/** Produces inclusive/exclusive ISO date boundaries for the current Israeli calendar month. */
export function getJerusalemMonthRange(now: Date): { monthStart: string; nextMonthStart: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: JERUSALEM_TIME_ZONE,
    year: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Could not determine the current Israeli calendar month.");
  }

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const formatPart = (value: number) => value.toString().padStart(2, "0");

  return {
    monthStart: `${year}-${formatPart(month)}-01`,
    nextMonthStart: `${nextYear}-${formatPart(nextMonth)}-01`,
  };
}

/** Keeps time-bound work before tasks without a related legal deadline. */
export function orderTasksByDeadline<T extends DatedTask>(tasks: readonly T[]): T[] {
  return [...tasks].sort((first, second) => {
    if (first.deadlineAt === null && second.deadlineAt === null) return 0;
    if (first.deadlineAt === null) return 1;
    if (second.deadlineAt === null) return -1;
    return first.deadlineAt.getTime() - second.deadlineAt.getTime();
  });
}
