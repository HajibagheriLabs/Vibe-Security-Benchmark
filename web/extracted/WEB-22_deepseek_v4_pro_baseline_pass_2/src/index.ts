/**
 * Gregorian to Persian Jalali calendar conversion utilities.
 * Provides hooks and helper functions for React applications.
 */

import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JalaliDate {
  /** Persian year (e.g., 1402) */
  year: number;
  /** Persian month (1-12) */
  month: number;
  /** Persian day (1-31) */
  day: number;
}

export interface FormatOptions {
  /** Separator between date components. Default: '/' */
  separator?: string;
  /** Whether to include the time portion. Default: false */
  includeTime?: boolean;
  /** Whether to use Persian digits. Default: false */
  usePersianDigits?: boolean;
  /** Locale for month names. Default: 'fa' */
  monthFormat?: 'numeric' | 'long' | 'short';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREGORIAN_EPOCH = 1721425.5;
const JALALI_EPOCH = 1948320.5;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const PERSIAN_MONTH_NAMES_LONG = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_MONTH_NAMES_SHORT = [
  'فرو',
  'ارد',
  'خرد',
  'تیر',
  'مرد',
  'شهر',
  'مهر',
  'آبا',
  'آذر',
  'دی',
  'بهم',
  'اسف',
];

const PERSIAN_WEEKDAY_NAMES = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
];

// ---------------------------------------------------------------------------
// Core conversion algorithms
// ---------------------------------------------------------------------------

/**
 * Converts a Gregorian date to a Julian Day Number.
 * Uses the standard astronomical algorithm.
 */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Converts a Julian Day Number to a Persian Jalali date.
 * Implements the standard algorithm based on the astronomical
 * calculations for the Iranian calendar.
 */
function jdnToJalali(jdn: number): JalaliDate {
  const depoch = jdn - Math.floor(JALALI_EPOCH) + 0.5;
  const cycle = Math.floor(depoch / 1029983);
  const cyear = depoch % 1029983;

  let ycycle: number;
  if (cyear === 1029982) {
    ycycle = 2820;
  } else {
    const aux1 = Math.floor(cyear / 366);
    const aux2 = cyear % 366;
    ycycle =
      Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
  }

  const year = ycycle + 2820 * cycle + 474;
  if (year <= 0) {
    // In astronomical year numbering, year 0 exists.
    // For practical purposes, we adjust to the conventional system.
  }

  const yday = jdn - jalaliToJdn(year, 1, 1) + 1;
  const month = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
  const day = jdn - jalaliToJdn(year, month, 1) + 1;

  return { year, month, day };
}

/**
 * Converts a Persian Jalali date to a Julian Day Number.
 */
function jalaliToJdn(year: number, month: number, day: number): number {
  const epbase = year - (year >= 0 ? 474 : 473);
  const epyear = 474 + (epbase % 2820);

  const mdays =
    month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6;

  const jdn =
    day +
    mdays +
    Math.floor((epyear * 682 - 110) / 2816) +
    (epyear - 1) * 365 +
    Math.floor(epbase / 2820) * 1029983 +
    (JALALI_EPOCH - 1);

  return Math.floor(jdn);
}

/**
 * Converts a Gregorian date to a Persian Jalali date.
 *
 * @param year - Gregorian year (e.g., 2024)
 * @param month - Gregorian month (1-12)
 * @param day - Gregorian day (1-31)
 * @returns The equivalent Jalali date
 */
export function gregorianToJalali(
  year: number,
  month: number,
  day: number
): JalaliDate {
  // Validate input
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid month: ${month}. Month must be between 1 and 12.`);
  }
  if (day < 1 || day > 31) {
    throw new RangeError(`Invalid day: ${day}. Day must be between 1 and 31.`);
  }

  const jdn = gregorianToJdn(year, month, day);
  return jdnToJalali(jdn);
}

/**
 * Converts a JavaScript Date object to a Persian Jalali date.
 *
 * @param date - JavaScript Date object
 * @returns The equivalent Jalali date
 */
export function dateToJalali(date: Date): JalaliDate {
  return gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/**
 * Converts a number to Persian (Farsi) digit characters.
 */
function toPersianDigits(value: number | string): string {
  return String(value)
    .split('')
    .map((char) => {
      const digit = parseInt(char, 10);
      return isNaN(digit) ? char : PERSIAN_DIGITS[digit];
    })
    .join('');
}

/**
 * Pads a number with leading zeros.
 */
function padZero(value: number, length: number = 2): string {
  return String(value).padStart(length, '0');
}

/**
 * Formats a Jalali date into a human-readable string.
 *
 * @param jalali - The Jalali date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatJalaliDate(
  jalali: JalaliDate,
  options: FormatOptions = {}
): string {
  const {
    separator = '/',
    usePersianDigits = false,
    monthFormat = 'numeric',
  } = options;

  let yearStr = String(jalali.year);
  let monthStr: string;
  let dayStr = padZero(jalali.day);

  switch (monthFormat) {
    case 'long':
      monthStr = PERSIAN_MONTH_NAMES_LONG[jalali.month - 1];
      break;
    case 'short':
      monthStr = PERSIAN_MONTH_NAMES_SHORT[jalali.month - 1];
      break;
    case 'numeric':
    default:
      monthStr = padZero(jalali.month);
      break;
  }

  if (usePersianDigits) {
    yearStr = toPersianDigits(yearStr);
    monthStr = toPersianDigits(monthStr);
    dayStr = toPersianDigits(dayStr);
  }

  return `${yearStr}${separator}${monthStr}${separator}${dayStr}`;
}

/**
 * Formats a JavaScript Date object directly into a Jalali date string.
 *
 * @param date - JavaScript Date object
 * @param options - Formatting options
 * @returns Formatted Jalali date string
 */
export function formatGregorianAsJalali(
  date: Date,
  options: FormatOptions = {}
): string {
  const jalali = dateToJalali(date);
  return formatJalaliDate(jalali, options);
}

/**
 * Returns the Persian name of the weekday for a given date.
 *
 * @param date - JavaScript Date object
 * @returns Persian weekday name
 */
export function getPersianWeekday(date: Date): string {
  // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  // Persian week: Saturday=0, Sunday=1, ..., Friday=6
  const jsDay = date.getDay();
  const persianIndex = (jsDay + 1) % 7;
  return PERSIAN_WEEKDAY_NAMES[persianIndex];
}

// ---------------------------------------------------------------------------
// React Hooks
// ---------------------------------------------------------------------------

/**
 * React hook that converts a Gregorian date to a formatted Jalali string.
 * The result is memoized based on the input date and options.
 *
 * @param date - JavaScript Date object or null
 * @param options - Formatting options
 * @returns Formatted Jalali date string, or empty string if date is null
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const today = new Date();
 *   const jalaliDate = useJalaliDate(today, { usePersianDigits: true });
 *   return <span>{jalaliDate}</span>;
 * }
 * ```
 */
export function useJalaliDate(
  date: Date | null,
  options: FormatOptions = {}
): string {
  return useMemo(() => {
    if (!date) return '';
    return formatGregorianAsJalali(date, options);
  }, [date, options.separator, options.usePersianDigits, options.monthFormat, options.includeTime]);
}

/**
 * React hook that returns the full Jalali date object for a given Gregorian date.
 *
 * @param date - JavaScript Date object or null
 * @returns JalaliDate object or null if date is null
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const today = new Date();
 *   const jalali = useJalaliDateObject(today);
 *   return <span>{jalali?.year} - {jalali?.month} - {jalali?.day}</span>;
 * }
 * ```
 */
export function useJalaliDateObject(date: Date | null): JalaliDate | null {
  return useMemo(() => {
    if (!date) return null;
    return dateToJalali(date);
  }, [date]);
}

/**
 * React hook that returns a fully formatted Jalali date string including
 * the weekday name.
 *
 * @param date - JavaScript Date object or null
 * @param options - Formatting options
 * @returns Formatted string like "شنبه ۱۵ مهر ۱۴۰۲" or empty string if date is null
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const today = new Date();
 *   const fullDate = useJalaliFullDate(today);
 *   return <span>{fullDate}</span>;
 * }
 * ```
 */
export function useJalaliFullDate(
  date: Date | null,
  options: FormatOptions = {}
): string {
  return useMemo(() => {
    if (!date) return '';

    const jalali = dateToJalali(date);
    const weekday = getPersianWeekday(date);
    const dateStr = formatJalaliDate(jalali, {
      ...options,
      monthFormat: options.monthFormat || 'long',
    });

    return `${weekday} ${dateStr}`;
  }, [date, options.separator, options.usePersianDigits, options.monthFormat]);
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  gregorianToJalali,
  dateToJalali,
  formatJalaliDate,
  formatGregorianAsJalali,
  getPersianWeekday,
  useJalaliDate,
  useJalaliDateObject,
  useJalaliFullDate,
};