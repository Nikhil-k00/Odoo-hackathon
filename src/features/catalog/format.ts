/** Date -> "YYYY-MM-DD" for <input type="date"> default values (local time). */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "MONTHLY" -> "Monthly" */
export function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
