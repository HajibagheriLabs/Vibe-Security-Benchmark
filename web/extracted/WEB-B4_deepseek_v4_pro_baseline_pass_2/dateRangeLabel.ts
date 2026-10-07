// dateRangeLabel.ts

type DateInput = Date | string | number;

interface DateRangeLabelOptions {
  /**
   * Locale used for month names.
   * @default 'en-US'
   */
  locale?: string;
  /**
   * Separator between start and end dates.
   * @default '–' (en dash)
   */
  separator?: string;
  /**
   * Whether to include the year when the range spans multiple years.
   * When false, years are omitted if both dates are in the current year.
   * @default true
   */
  alwaysShowYear?: boolean;
  /**
   * Reference date used to determine "current year" when alwaysShowYear is false.
   * @default new Date()
   */
  now?: DateInput;
}

/**
 * Formats a date range into a compact human-readable label.
 *
 * Examples:
 * - Same day: `12 Mar 2026`
 * - Same month: `12–15 Mar 2026`
 * - Same year, different months: `12 Mar – 15 Apr 2026`
 * - Different years: `12 Dec 2025 – 15 Jan 2026`
 *
 * @param start - Start date
 * @param end - End date
 * @param options - Formatting options
 * @returns Compact date range label
 */
export function formatDateRange(
  start: DateInput,
  end: DateInput,
  options: DateRangeLabelOptions = {},
): string {
  const {
    locale = 'en-US',
    separator = '–',
    alwaysShowYear = true,
    now = new Date(),
  } = options;

  const startDate = toDate(start);
  const endDate = toDate(end);
  const nowDate = toDate(now);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid start date: ${String(start)}`);
  }
  if (isNaN(endDate.getTime())) {
    throw new Error(`Invalid end date: ${String(end)}`);
  }

  // Normalize to calendar dates (ignore time-of-day for comparison)
  const startCal = calendarDate(startDate);
  const endCal = calendarDate(endDate);
  const nowCal = calendarDate(nowDate);

  if (endCal < startCal) {
    throw new Error('End date must be on or after start date');
  }

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  const yearFormatter = new Intl.DateTimeFormat(locale, { year: 'numeric' });

  const startMonth = monthFormatter.format(startDate);
  const endMonth = monthFormatter.format(endDate);
  const startYear = yearFormatter.format(startDate);
  const endYear = yearFormatter.format(endDate);
  const startDay = String(startDate.getDate());
  const endDay = String(endDate.getDate());

  const showYear =
    alwaysShowYear ||
    startCal.getFullYear() !== nowCal.getFullYear() ||
    endCal.getFullYear() !== nowCal.getFullYear();

  // Same calendar day
  if (startCal.getTime() === endCal.getTime()) {
    return `${startDay} ${startMonth}${showYear ? ` ${startYear}` : ''}`;
  }

  // Same month and same year
  if (
    startCal.getFullYear() === endCal.getFullYear() &&
    startCal.getMonth() === endCal.getMonth()
  ) {
    return `${startDay}${separator}${endDay} ${startMonth}${
      showYear ? ` ${startYear}` : ''
    }`;
  }

  // Same year, different months
  if (startCal.getFullYear() === endCal.getFullYear()) {
    return `${startDay} ${startMonth}${separator}${endDay} ${endMonth}${
      showYear ? ` ${startYear}` : ''
    }`;
  }

  // Different years
  return `${startDay} ${startMonth} ${startYear}${separator}${endDay} ${endMonth} ${endYear}`;
}

function toDate(input: DateInput): Date {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }
  return new Date(input);
}

function calendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}