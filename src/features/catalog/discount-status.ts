export type DiscountStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "EXHAUSTED";

/**
 * Derives the display status of a discount from its dates and usage.
 * SCHEDULED: starts in the future. EXPIRED: end date passed.
 * EXHAUSTED: usage limit reached. ACTIVE: otherwise.
 */
export function discountStatus(
  d: { startDate: Date; endDate: Date; usageLimit: number | null; usedCount: number },
  now: Date = new Date()
): DiscountStatus {
  if (now < d.startDate) return "SCHEDULED";
  if (now > d.endDate) return "EXPIRED";
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return "EXHAUSTED";
  return "ACTIVE";
}
