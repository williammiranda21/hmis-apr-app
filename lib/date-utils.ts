/**
 * Format a date-only string from the APR (YYYY-MM-DD) without timezone drift.
 *
 * `new Date("2026-04-01")` parses as UTC midnight. In Eastern time that's
 * 2026-03-31 20:00, so `toLocaleDateString()` displays "Mar 31". We want
 * the literal calendar date, so parse the components manually and build
 * a local-midnight Date instead.
 */
export const formatAprDate = (
  s: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!s) return "—";
  const opts = options ?? { year: "numeric", month: "short", day: "numeric" };
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const local = new Date(Number(y), Number(m) - 1, Number(d));
    return local.toLocaleDateString(undefined, opts);
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return s;
  return parsed.toLocaleDateString(undefined, opts);
};

export const formatAprRange = (
  start: string | null | undefined,
  end: string | null | undefined
): string => {
  if (!start || !end) return "—";
  const s = formatAprDate(start, { month: "short", day: "numeric" });
  const e = formatAprDate(end, { month: "short", day: "numeric", year: "numeric" });
  return `${s} – ${e}`;
};
