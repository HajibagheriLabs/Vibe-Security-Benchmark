/**
 * Persian Jalali Calendar Utilities
 * Algorithm based on the astronomical calculations for the Solar Hijri calendar
 */

export interface PersianDate {
  year: number;
  month: number;
  day: number;
}

export interface PersianDateStringOptions {
  locale?: 'fa' | 'en';
  format?: 'full' | 'short' | 'numeric';
  showWeekday?: boolean;
}

const PERSIAN_MONTHS_FA = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const PERSIAN_MONTHS_EN = [
  'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'
];

const WEEKDAYS_FA = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
];

const WEEKDAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts a Gregorian Date to Persian Jalali date
 * Uses the algorithm from "Calendrical Calculations" by Dershowitz & Reingold
 */
export function gregorianToJalali(date: Date): PersianDate {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  // Days since March 21, 622 CE (Jalali epoch)
  const gDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const jDays = [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336];

  let gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + gDays[gm - 1];

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;

  let jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

  return { year: jy, month: jm, day: jd };
}

/**
 * Converts Persian Jalali date to Gregorian Date
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const jDays = [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336];
  const gDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  let days = jd - 1 + jDays[jm - 1];
  if (jm > 6) days += (jm - 6) * 30;
  else days += (jm - 1) * 31;

  let jy2 = jy + 1595;
  days += 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor((jy2 % 33 + 3) / 4);

  let gy = 621 + 400 * Math.floor(days / 146097);
  days %= 146097;
  let c = Math.floor(days / 36524);
  if (c === 4) c = 3;
  gy += 100 * c;
  days -= 36524 * c;
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;

  let gm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let gd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

  // Adjust for leap year
  if (gm > 2 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
    gd++;
  }

  return new Date(gy, gm - 1, gd);
}

/**
 * Formats a Persian date as a localized string
 */
export function formatPersianDate(
  persianDate: PersianDate,
  options: PersianDateStringOptions = {}
): string {
  const { locale = 'fa', format = 'full', showWeekday = false } = options;
  const months = locale === 'fa' ? PERSIAN_MONTHS_FA : PERSIAN_MONTHS_EN;
  const weekdays = locale === 'fa' ? WEEKDAYS_FA : WEEKDAYS_EN;
  const digits = locale === 'fa' ? PERSIAN_DIGITS : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const toPersianDigits = (num: number): string => {
    return num.toString().split('').map(d => digits[parseInt(d, 10)]).join('');
  };

  const dayStr = toPersianDigits(persianDate.day);
  const monthStr = months[persianDate.month - 1];
  const yearStr = toPersianDigits(persianDate.year);

  let result = '';

  if (showWeekday) {
    const gregorian = jalaliToGregorian(persianDate.year, persianDate.month, persianDate.day);
    const weekday = weekdays[gregorian.getDay()];
    result += `${weekday}، `;
  }

  switch (format) {
    case 'full':
      result += `${dayStr} ${monthStr} ${yearStr}`;
      break;
    case 'short':
      result += `${dayStr} ${monthStr}`;
      break;
    case 'numeric':
      const monthNum = toPersianDigits(persianDate.month).padStart(2, digits[0]);
      const dayNum = toPersianDigits(persianDate.day).padStart(2, digits[0]);
      result += `${yearStr}/${monthNum}/${dayNum}`;
      break;
  }

  return result;
}

/**
 * React hook for converting and formatting dates to Persian Jalali
 */
export function usePersianDate(date: Date | null | undefined, options?: PersianDateStringOptions): string {
  if (!date) return '';
  const persianDate = gregorianToJalali(date);
  return formatPersianDate(persianDate, options);
}

/**
 * Get current Persian date
 */
export function getCurrentPersianDate(): PersianDate {
  return gregorianToJalali(new Date());
}

/**
 * Check if a Persian year is a leap year
 * Persian leap years follow a 33-year cycle with 8 leap years
 */
export function isPersianLeapYear(year: number): boolean {
  const cycle = year % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(cycle);
}

/**
 * Get number of days in a Persian month
 */
export function getPersianMonthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isPersianLeapYear(year) ? 30 : 29;
}