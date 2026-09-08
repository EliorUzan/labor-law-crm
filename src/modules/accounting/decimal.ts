/** Exact fixed-scale decimal arithmetic for values returned by PostgreSQL numeric columns. */
function toCents(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("Expected an exact decimal amount from the database.");
  const [, sign, whole, fraction = ""] = match;
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return sign ? -cents : cents;
}

function fromCents(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

export function addAmounts(...values: string[]): string {
  return fromCents(values.reduce((total, value) => total + toCents(value), 0n));
}

export function subtractAmounts(first: string, ...values: string[]): string {
  return fromCents(values.reduce((total, value) => total - toCents(value), toCents(first)));
}

export function positiveAmount(value: string): string | null {
  return toCents(value) > 0n ? fromCents(toCents(value)) : null;
}

export function isNegativeAmount(value: string): boolean {
  return toCents(value) < 0n;
}
