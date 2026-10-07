import { useState, useEffect, useCallback } from 'react';
import {
  dateToJalali,
  formatJalali,
  FormatOptions,
  JalaliDate,
} from './index';

export interface UseJalaliDateResult {
  /** The Jalali date object */
  jalaliDate: JalaliDate;
  /** Formatted Jalali date string */
  formatted: string;
  /** Update the internal date */
  setDate: (date: Date) => void;
  /** Refresh the Jalali date from the current Date */
  refresh: () => void;
}

/**
 * React hook that converts a Gregorian Date to a Jalali date and
 * provides a formatted string. Re-renders when the input date changes.
 *
 * @param initialDate - The initial Gregorian Date (defaults to now)
 * @param options - Formatting options
 * @returns Object containing the Jalali date, formatted string, and setters
 */
export function useJalaliDate(
  initialDate: Date = new Date(),
  options: FormatOptions = {},
): UseJalaliDateResult {
  const [date, setDateInternal] = useState<Date>(initialDate);
  const [jalaliDate, setJalaliDate] = useState<JalaliDate>(() =>
    dateToJalali(initialDate),
  );
  const [formatted, setFormatted] = useState<string>(() =>
    formatJalali(dateToJalali(initialDate), options),
  );

  const updateJalali = useCallback(
    (d: Date) => {
      const jd = dateToJalali(d);
      setJalaliDate(jd);
      setFormatted(formatJalali(jd, options));
    },
    [options.format, options.locale, options.usePersianDigits],
  );

  const setDate = useCallback(
    (d: Date) => {
      setDateInternal(d);
      updateJalali(d);
    },
    [updateJalali],
  );

  const refresh = useCallback(() => {
    updateJalali(date);
  }, [date, updateJalali]);

  useEffect(() => {
    updateJalali(date);
  }, [date, updateJalali]);

  return { jalaliDate, formatted, setDate, refresh };
}

export default useJalaliDate;