/** Rounds to 2 decimal places, avoiding float drift (1.005 -> 1.01). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a number as Indian Rupees, e.g. 125000 -> "₹1,25,000.00". */
export function formatINR(n: number): string {
  return inr.format(round2(n));
}
