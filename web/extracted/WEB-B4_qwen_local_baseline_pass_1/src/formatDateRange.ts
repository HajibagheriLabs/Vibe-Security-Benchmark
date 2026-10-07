export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Formats a date range into a compact human-readable label.
 * 
 * Examples:
 * - Same day: "12 Mar 2026"
 * - Same month: "12–15 Mar 2026"
 * - Same year: "12 Mar – 15 Apr 2026"
 * - Different years: "12 Mar 2025 – 15 Apr 2026"
 * 
 * @param range The date range to format.
 * @returns The formatted string.
 */
export function formatDateRange(range: DateRange): string {
  const { start, end } = range;

  // Validate inputs
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date provided');
  }

  // Normalize to start of day to avoid DST issues affecting day comparison
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const sameDay = startDay.getTime() === endDay.getTime();
  const sameMonth = startDay.getFullYear() === endDay.getFullYear() && startDay.getMonth() === endDay.getMonth();
  const sameYear = startDay.getFullYear() === endDay.getFullYear();

  const formatDayMonth = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    return `${day} ${month}`;
  };

  const formatFull = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  if (sameDay) {
    return formatFull(start);
  }

  if (sameMonth) {
    return `${formatDayMonth(start)}–${formatDayMonth(end)} ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${formatDayMonth(start)} – ${formatDayMonth(end)} ${start.getFullYear()}`;
  }

  return `${formatFull(start)} – ${formatFull(end)}`;
}