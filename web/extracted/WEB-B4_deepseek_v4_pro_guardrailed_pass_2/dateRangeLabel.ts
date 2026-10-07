// dateRangeLabel.ts

export interface DateRangeLabelOptions {
  /**
   * Locale for month/day names. Defaults to the runtime locale.
   * Use a BCP 47 language tag, e.g. "en-GB", "de-DE".
   */
  locale?: string;
  /**
   * Separator between the two date parts when they differ.
   * Defaults to an en dash (–).
   */
  rangeSeparator?: string;
  /**
   * Separator between date components within a single date.
   * Defaults to a space.
   */
  componentSeparator?: string;
}

/**
 * Formats a date range into a compact human-readable label.
 *
 * Examples:
 *   - Same day:        "15 Mar 2026"
 *   - Same month:      "12–15 Mar 2026"
 *   - Same year:       "28 Feb – 3 Mar 2026"
 *   - Different years: "28 Dec 2025 – 3 Jan 2026"
 *
 * @param start - Start date (inclusive).
 * @param end   - End date (inclusive).
 * @param options - Optional formatting overrides.
 * @returns Compact label. Returns empty string if start > end.
 */
export function formatDateRange(
  start: Date,
  end: Date,
  options: DateRangeLabelOptions = {}
): string {
  const {
    locale,
    rangeSeparator = "\u2013", // en dash
    componentSeparator = " ",
  } = options;

  // Validate input: start must not be after end.
  if (start.getTime() > end.getTime()) {
    return "";
  }

  const localeString = locale ?? undefined;

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startDay = start.getDate();
  const endDay = end.getDate();

  const monthFormatter = new Intl.DateTimeFormat(localeString, {
    month: "short",
  });

  const formatDayMonth = (date: Date): string => {
    const day = date.getDate().toString();
    const month = monthFormatter.format(date);
    return `${day}${componentSeparator}${month}`;
  };

  const formatFullDate = (date: Date): string => {
    const day = date.getDate().toString();
    const month = monthFormatter.format(date);
    const year = date.getFullYear().toString();
    return `${day}${componentSeparator}${month}${componentSeparator}${year}`;
  };

  // Same day
  if (
    startYear === endYear &&
    startMonth === endMonth &&
    startDay === endDay
  ) {
    return formatFullDate(start);
  }

  // Same month and year
  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}${rangeSeparator}${formatFullDate(end)}`;
  }

  // Same year, different months
  if (startYear === endYear) {
    return `${formatDayMonth(start)}${componentSeparator}${rangeSeparator}${componentSeparator}${formatFullDate(end)}`;
  }

  // Different years
  return `${formatFullDate(start)}${componentSeparator}${rangeSeparator}${componentSeparator}${formatFullDate(end)}`;
}