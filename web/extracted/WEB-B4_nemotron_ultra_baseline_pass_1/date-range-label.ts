/**
 * Formats a date range into a compact human-readable label.
 * Examples:
 *   12–15 Mar 2026          (same month & year)
 *   31 Dec 2025 – 2 Jan 2026 (cross-year)
 *   28 Feb – 3 Mar 2026     (same year, different months)
 *   15 Mar 2026             (single day)
 */

export interface DateRangeLabelOptions {
  /** Locale for month names (default: 'en-US') */
  locale?: string;
  /** Use en-dash (–) instead of hyphen (-) (default: true) */
  useEnDash?: boolean;
  /** Time zone for formatting (default: system local) */
  timeZone?: string;
}

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_USE_EN_DASH = true;

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDay(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    timeZone,
  }).format(date);
}

function formatMonth(date: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    timeZone,
  }).format(date);
}

function formatYear(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    timeZone,
  }).format(date);
}

function sameDay(a: Date, b: Date, timeZone?: string): boolean {
  return (
    formatDay(a, timeZone) === formatDay(b, timeZone) &&
    formatMonth(a, DEFAULT_LOCALE, timeZone) === formatMonth(b, DEFAULT_LOCALE, timeZone) &&
    formatYear(a, timeZone) === formatYear(b, timeZone)
  );
}

function sameMonth(a: Date, b: Date, timeZone?: string): boolean {
  return (
    formatMonth(a, DEFAULT_LOCALE, timeZone) === formatMonth(b, DEFAULT_LOCALE, timeZone) &&
    formatYear(a, timeZone) === formatYear(b, timeZone)
  );
}

function sameYear(a: Date, b: Date, timeZone?: string): boolean {
  return formatYear(a, timeZone) === formatYear(b, timeZone);
}

export function formatDateRangeLabel(
  start: Date | number | string,
  end: Date | number | string,
  options: DateRangeLabelOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, useEnDash = DEFAULT_USE_EN_DASH, timeZone } = options;

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date provided to formatDateRangeLabel');
  }

  const dash = useEnDash ? '–' : '-';

  // Same day
  if (sameDay(startDate, endDate, timeZone)) {
    const day = formatDay(startDate, timeZone);
    const month = formatMonth(startDate, locale, timeZone);
    const year = formatYear(startDate, timeZone);
    return `${day} ${month} ${year}`;
  }

  const startDay = formatDay(startDate, timeZone);
  const endDay = formatDay(endDate, timeZone);
  const startMonth = formatMonth(startDate, locale, timeZone);
  const endMonth = formatMonth(endDate, locale, timeZone);
  const startYear = formatYear(startDate, timeZone);
  const endYear = formatYear(endDate, timeZone);

  // Same month & year
  if (sameMonth(startDate, endDate, timeZone)) {
    return `${startDay}${dash}${endDay} ${startMonth} ${startYear}`;
  }

  // Same year, different months
  if (sameYear(startDate, endDate, timeZone)) {
    return `${startDay} ${startMonth}${dash}${endDay} ${endMonth} ${startYear}`;
  }

  // Cross-year
  return `${startDay} ${startMonth} ${startYear}${dash}${endDay} ${endMonth} ${endYear}`;
}

export default formatDateRangeLabel;