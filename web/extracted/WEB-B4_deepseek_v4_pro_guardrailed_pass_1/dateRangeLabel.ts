// dateRangeLabel.ts

/**
 * Formats a date range into a compact human-readable label.
 *
 * Rules:
 * - Same day: "12 Mar 2026"
 * - Same month, same year: "12–15 Mar 2026"
 * - Different months, same year: "12 Mar – 15 Apr 2026"
 * - Different years: "12 Mar 2025 – 15 Apr 2026"
 *
 * Uses en-GB day-month ordering and an en dash (–) as separator.
 * All inputs must be valid Date objects. Invalid dates throw.
 */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function assertValidDate(date: Date, label: string): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError(`${label} must be a valid Date`);
  }
}

function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function formatFull(date: Date): string {
  return `${formatDayMonth(date)} ${date.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth()
  );
}

function isSameYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear();
}

/**
 * Formats a date range into a compact human-readable label.
 *
 * @param start - The start date (inclusive).
 * @param end - The end date (inclusive).
 * @returns A compact label, e.g. "12–15 Mar 2026".
 * @throws {TypeError} If either argument is not a valid Date.
 * @throws {RangeError} If end is before start.
 */
export function formatDateRange(start: Date, end: Date): string {
  assertValidDate(start, 'start');
  assertValidDate(end, 'end');

  if (end.getTime() < start.getTime()) {
    throw new RangeError('end must be on or after start');
  }

  if (isSameDay(start, end)) {
    return formatFull(start);
  }

  if (isSameMonth(start, end)) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  }

  if (isSameYear(start, end)) {
    return `${formatDayMonth(start)} – ${formatDayMonth(end)} ${start.getFullYear()}`;
  }

  return `${formatFull(start)} – ${formatFull(end)}`;
}