/**
 * Formats a date range into a compact human-readable label.
 * Examples:
 *   - Same day: "12 Mar 2026"
 *   - Same month/year: "12–15 Mar 2026"
 *   - Same year: "12 Mar – 15 Apr 2026"
 *   - Different years: "12 Mar 2026 – 15 Apr 2027"
 */
export function formatDateRange(start: Date, end: Date): string {
  if (start > end) {
    throw new RangeError("start date must be before or equal to end date");
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  const sameYear = start.getFullYear() === end.getFullYear();

  const day = (d: Date) => d.getDate().toString();
  const month = (d: Date) =>
    d.toLocaleString("en-US", { month: "short" });
  const year = (d: Date) => d.getFullYear().toString();

  if (sameDay) {
    return `${day(start)} ${month(start)} ${year(start)}`;
  }

  if (sameMonth) {
    return `${day(start)}–${day(end)} ${month(start)} ${year(start)}`;
  }

  if (sameYear) {
    return `${day(start)} ${month(start)} – ${day(end)} ${month(end)} ${year(start)}`;
  }

  return `${day(start)} ${month(start)} ${year(start)} – ${day(end)} ${month(end)} ${year(end)}`;
}