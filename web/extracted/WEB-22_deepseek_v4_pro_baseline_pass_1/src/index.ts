/**
 * Gregorian to Jalali (Persian) calendar conversion utilities.
 * Implements the algorithm based on the astronomical calculation method
 * commonly used in Iran (the "33-year cycle" algorithm).
 */

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export interface FormatOptions {
  /** Format string with placeholders: YYYY, MM, DD, M, D */
  format?: string;
  /** Locale for month names */
  locale?: 'fa' | 'en';
  /** Whether to use Persian digits */
  usePersianDigits?: boolean;
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const PERSIAN_MONTH_NAMES = [
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

const PERSIAN_MONTH_NAMES_EN = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand',
];

const PERSIAN_WEEKDAY_NAMES = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

const PERSIAN_WEEKDAY_NAMES_EN = [
  'Shanbeh',
  'Yekshanbeh',
  'Doshanbeh',
  'Seshanbeh',
  'Chaharshanbeh',
  'Panjshanbeh',
  'Jomeh',
];

/** Number of days from the start of the Gregorian calendar to the start of the Jalali calendar (March 19, 622 CE) */
const JALALI_EPOCH_OFFSET = 226894; // Days from 0001-01-01 to 0622-03-19

const GREGORIAN_EPOCH = 1721425.5; // Julian day number for 0001-01-01

/** Days in each Gregorian month (non-leap year) */
const GREGORIAN_MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Days in each Jalali month (non-leap year) */
const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

/**
 * Convert a number to Persian digits string.
 */
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)]);
}

/**
 * Check if a Gregorian year is a leap year.
 */
export function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Check if a Jalali year is a leap year.
 * Uses the 33-year cycle algorithm.
 */
export function isJalaliLeapYear(year: number): boolean {
  const cycle = [1, 5, 9, 13, 17, 22, 26, 30];
  const remainder = year % 33;
  return cycle.includes(remainder);
}

/**
 * Get the number of days in a Jalali month.
 */
export function jalaliMonthLength(year: number, month: number): number {
  if (month === 12) {
    return isJalaliLeapYear(year) ? 30 : 29;
  }
  return JALALI_MONTH_DAYS[month - 1];
}

/**
 * Convert a Gregorian date to a Julian Day Number.
 */
function gregorianToJdn(year: number, month: number, day: number): number {
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
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
 * Convert a Julian Day Number to a Jalali date.
 */
function jdnToJalali(jdn: number): JalaliDate {
  const depoch = jdn - gregorianToJdn(475, 1, 1);
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
  let year = ycycle + 2820 * cycle + 474;
  if (year <= 0) {
    year -= 1;
  }
  const yday = jdn - gregorianToJdn(year, 3, 1) + 1;
  let month: number;
  let day: number;
  if (yday <= 186) {
    month = Math.ceil(yday / 31);
    day = yday - (month - 1) * 31;
  } else {
    month = Math.ceil((yday - 6) / 30);
    day = yday - (month - 1) * 30 - 6;
  }
  return { year, month, day };
}

/**
 * Convert a Gregorian date to a Jalali date.
 */
export function gregorianToJalali(
  year: number,
  month: number,
  day: number,
): JalaliDate {
  const jdn = gregorianToJdn(year, month, day);
  return jdnToJalali(jdn);
}

/**
 * Convert a JavaScript Date object to a Jalali date.
 */
export function dateToJalali(date: Date): JalaliDate {
  return gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

/**
 * Get the weekday index (0 = Saturday, 6 = Friday) for a Jalali date.
 */
export function jalaliWeekday(year: number, month: number, day: number): number {
  const jdn = gregorianToJdn(
    jalaliToGregorian(year, month, day).year,
    jalaliToGregorian(year, month, day).month,
    jalaliToGregorian(year, month, day).day,
  );
  return (jdn + 1) % 7;
}

/**
 * Convert a Jalali date to a Gregorian date.
 */
export function jalaliToGregorian(
  year: number,
  month: number,
  day: number,
): { year: number; month: number; day: number } {
  const jdn =
    gregorianToJdn(year + 621, 3, 21) +
    (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) +
    (day - 1);
  const gYear = Math.floor((jdn - GREGORIAN_EPOCH) / 365.2425);
  let gMonth = 1;
  let gDay = 1;
  let remaining = jdn - gregorianToJdn(gYear, 1, 1);
  const monthDays = [...GREGORIAN_MONTH_DAYS];
  if (isGregorianLeapYear(gYear)) {
    monthDays[1] = 29;
  }
  for (let i = 0; i < 12; i++) {
    if (remaining < monthDays[i]) {
      gMonth = i + 1;
      gDay = remaining + 1;
      break;
    }
    remaining -= monthDays[i];
  }
  return { year: gYear, month: gMonth, day: gDay };
}

/**
 * Format a Jalali date as a string.
 */
export function formatJalali(
  jalaliDate: JalaliDate,
  options: FormatOptions = {},
): string {
  const {
    format = 'YYYY/MM/DD',
    locale = 'fa',
    usePersianDigits = true,
  } = options;

  const monthNames =
    locale === 'fa' ? PERSIAN_MONTH_NAMES : PERSIAN_MONTH_NAMES_EN;

  const pad = (value: number, length: number = 2): string =>
    String(value).padStart(length, '0');

  const yearStr = pad(jalaliDate.year, 4);
  const monthStr = pad(jalaliDate.month, 2);
  const dayStr = pad(jalaliDate.day, 2);
  const monthName = monthNames[jalaliDate.month - 1];

  let result = format
    .replace(/YYYY/g, yearStr)
    .replace(/MM/g, monthStr)
    .replace(/DD/g, dayStr)
    .replace(/M/g, String(jalaliDate.month))
    .replace(/D/g, String(jalaliDate.day))
    .replace(/MMMM/g, monthName);

  if (usePersianDigits) {
    result = toPersianDigits(result);
  }

  return result;
}

/**
 * Convert a Gregorian date to a formatted Jalali string.
 */
export function gregorianToJalaliString(
  year: number,
  month: number,
  day: number,
  options: FormatOptions = {},
): string {
  const jalaliDate = gregorianToJalali(year, month, day);
  return formatJalali(jalaliDate, options);
}

/**
 * Convert a JavaScript Date to a formatted Jalali string.
 */
export function dateToJalaliString(
  date: Date,
  options: FormatOptions = {},
): string {
  const jalaliDate = dateToJalali(date);
  return formatJalali(jalaliDate, options);
}

/**
 * Get the Jalali month name.
 */
export function getJalaliMonthName(
  month: number,
  locale: 'fa' | 'en' = 'fa',
): string {
  const names = locale === 'fa' ? PERSIAN_MONTH_NAMES : PERSIAN_MONTH_NAMES_EN;
  return names[month - 1];
}

/**
 * Get the Jalali weekday name.
 */
export function getJalaliWeekdayName(
  weekdayIndex: number,
  locale: 'fa' | 'en' = 'fa',
): string {
  const names =
    locale === 'fa' ? PERSIAN_WEEKDAY_NAMES : PERSIAN_WEEKDAY_NAMES_EN;
  return names[weekdayIndex];
}

export { PERSIAN_MONTH_NAMES, PERSIAN_MONTH_NAMES_EN, PERSIAN_WEEKDAY_NAMES, PERSIAN_WEEKDAY_NAMES_EN };