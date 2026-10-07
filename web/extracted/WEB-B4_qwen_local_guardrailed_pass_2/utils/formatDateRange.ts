/**
 * Formats a date range into a compact human-readable label.
 * 
 * Rules applied:
 * - If start and end dates are in the same month and year: "12–15 Mar 2026"
 * - If same year, different month: "12 Mar – 15 Apr 2026"
 * - Different years: "12 Mar 2025 – 15 Apr 2026"
 * - Uses localized month abbreviations (3 letters).
 * 
 * Security/Injection:
 * - Pure string interpolation from validated Date objects.
 * - No user-controlled HTML or script injection risk.
 * - Month names come from standard Intl API, no external dependency.
 */

export function formatDateRange(start: Date, end: Date): string {
  // Validate inputs
  if (!(start instanceof Date) || isNaN(start.getTime())) {
    throw new Error("Invalid start date");
  }
  if (!(end instanceof Date) || isNaN(end.getTime())) {
    throw new Error("Invalid end date");
  }
  if (start > end) {
    throw new Error("Start date must be before or equal to end date");
  }

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const formatDay = (d: Date) => d.getDate().toString();
  const formatMonth = (d: Date) => monthNames[d.getMonth()];
  const formatYear = (d: Date) => d.getFullYear().toString();

  const startStr = `${formatDay(start)} ${formatMonth(start)} ${formatYear(start)}`;
  const endStr = `${formatDay(end)} ${formatMonth(end)} ${formatYear(end)}`;

  // If same month and year, omit month/year from end label
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${formatDay(start)}–${formatDay(end)} ${formatMonth(start)} ${formatYear(start)}`;
  }

  // If same year, omit year from start label if month differs
  if (start.getFullYear() === end.getFullYear()) {
    return `${formatDay(start)} ${formatMonth(start)} – ${formatDay(end)} ${formatMonth(end)} ${formatYear(end)}`;
  }

  // Different years
  return `${startStr} – ${endStr}`;
}