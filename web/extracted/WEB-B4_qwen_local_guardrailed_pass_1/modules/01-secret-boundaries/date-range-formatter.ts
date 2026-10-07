// Rule Set: §3 (Injection - XSS/Formatting safety via strict locale and textContent-safe output)
// No secrets involved. No DOM sinks. Pure functional transformation.

export type DateRangeOptions = {
  locale?: string;
  // If true, omits the year if both dates are in the same year.
  // Default: false (always show year for compact clarity).
  omitSameYear?: boolean;
};

const DEFAULT_LOCALE = 'en-GB';

/**
 * Formats a start and end date into a compact human-readable label.
 * Example: "12–15 Mar 2026"
 * 
 * Security/Robustness notes:
 * - Uses Intl.DateTimeFormat for robust, locale-aware formatting (no manual string concat of numbers).
 * - Strictly checks Date validity to prevent "Invalid Date" leakage.
 * - Output is plain string, safe for textContent or JSON.
 */
export function formatCompactDateRange(
  start: Date,
  end: Date,
  options: DateRangeOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, omitSameYear = false } = options;

  // Validation: Ensure inputs are valid Dates
  if (!(start instanceof Date) || isNaN(start.getTime())) {
    throw new Error('Invalid start date');
  }
  if (!(end instanceof Date) || isNaN(end.getTime())) {
    throw new Error('Invalid end date');
  }

  // Logic: Determine if years are the same
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const yearsAreSame = startYear === endYear;

  // Formatter configuration
  const baseFormat: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };

  // Helper to format a single date part
  const formatDatePart = (date: Date, includeYear: boolean): string => {
    const opts = { ...baseFormat };
    if (!includeYear) {
      delete opts.year;
    }
    // Use en-GB as fallback for consistent "short" month names if locale isn't specified
    const formatter = new Intl.DateTimeFormat(locale, opts);
    return formatter.format(date);
  };

  const startStr = formatDatePart(start, true); // Always include year for start
  const endStr = formatDatePart(end, yearsAreSame ? !omitSameYear : true);

  // Construct the range string
  // Using U+2013 (EN DASH) for compact ranges, standard in typography
  if (startStr === endStr) {
    return startStr;
  }

  return `${startStr}–${endStr}`;
}

/**
 * Utility to extract just the month/day part for internal comparison if needed,
 * though the main function handles logic directly.
 */
export function formatMonthDay(date: Date, locale: string = DEFAULT_LOCALE): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  });
  return formatter.format(date);
}