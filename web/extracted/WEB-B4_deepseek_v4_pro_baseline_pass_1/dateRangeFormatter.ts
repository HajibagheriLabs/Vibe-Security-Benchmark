// dateRangeFormatter.ts

export interface DateRangeFormatterOptions {
  /**
   * Locale to use for month names and formatting.
   * @default 'en-US'
   */
  locale?: string;
  /**
   * Whether to include the year when the range spans multiple years.
   * @default true
   */
  includeYear?: boolean;
  /**
   * Custom separator between dates.
   * @default '–' (en dash)
   */
  separator?: string;
}

/**
 * Formats a date range into a compact human-readable label.
 *
 * Examples:
 * - Same day: "12 Mar 2026"
 * - Same month: "12–15 Mar 2026"
 * - Same year, different months: "12 Mar – 15 Apr 2026"
 * - Different years: "12 Mar 2025 – 15 Apr 2026"
 *
 * @param startDate - The start date of the range.
 * @param endDate - The end date of the range.
 * @param options - Formatting options.
 * @returns A compact human-readable date range label.
 */
export function formatDateRange(
  startDate: Date,
  endDate: Date,
  options: DateRangeFormatterOptions = {}
): string {
  const {
    locale = 'en-US',
    includeYear = true,
    separator = '–',
  } = options;

  // Normalize dates to midnight to avoid time-of-day affecting comparisons
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (start > end) {
    throw new Error('Start date must be before or equal to end date');
  }

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  const yearFormatter = new Intl.DateTimeFormat(locale, { year: 'numeric' });

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = monthFormatter.format(start);
  const endMonth = monthFormatter.format(end);
  const startYear = yearFormatter.format(start);
  const endYear = yearFormatter.format(end);

  const sameDay = start.getTime() === end.getTime();
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameDay) {
    return `${startDay} ${startMonth} ${startYear}`;
  }

  if (sameMonth) {
    return `${startDay}${separator}${endDay} ${startMonth} ${startYear}`;
  }

  if (sameYear) {
    return `${startDay} ${startMonth} ${separator} ${endDay} ${endMonth} ${startYear}`;
  }

  // Different years
  if (includeYear) {
    return `${startDay} ${startMonth} ${startYear} ${separator} ${endDay} ${endMonth} ${endYear}`;
  }

  return `${startDay} ${startMonth} ${separator} ${endDay} ${endMonth}`;
}