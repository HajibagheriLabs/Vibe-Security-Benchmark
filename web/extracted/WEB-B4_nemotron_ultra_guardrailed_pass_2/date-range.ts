/**
 * Formats a date range into a compact human-readable label.
 * Examples:
 *   - Same day:     "12 Mar 2026"
 *   - Same month:   "12–15 Mar 2026"
 *   - Same year:    "12 Mar – 15 Apr 2026"
 *   - Cross-year:   "12 Dec 2025 – 15 Jan 2026"
 */
export function formatDateRange(start: Date, end: Date): string {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    throw new TypeError('Both arguments must be Date instances');
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new TypeError('Both arguments must be valid Date instances');
  }

  const day = (d: Date) => d.getDate();
  const month = (d: Date) => d.toLocaleString('en-US', { month: 'short' });
  const year = (d: Date) => d.getFullYear();

  const sameDay = start.getTime() === end.getTime();
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

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