export type BillingPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/** Returns a new Date `days` days after `date` (negative values go back). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Adds months, clamping the day to the end of the target month (Jan 31 + 1 -> Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** Advances a date by one billing period. */
export function addPeriod(date: Date, period: BillingPeriod | string): Date {
  switch (period) {
    case "DAILY":
      return addDays(date, 1);
    case "WEEKLY":
      return addDays(date, 7);
    case "MONTHLY":
      return addMonths(date, 1);
    case "YEARLY":
      return addMonths(date, 12);
    default:
      throw new Error(`Unknown billing period: ${period}`);
  }
}

/** Start of day (local time) for date-only comparisons. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formats a date as DD Mon YYYY (en-IN). */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}
