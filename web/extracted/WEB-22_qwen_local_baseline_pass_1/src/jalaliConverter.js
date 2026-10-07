/**
 * Persian (Jalali) Calendar Utility
 * 
 * Converts Gregorian dates to Persian Jalali calendar strings.
 * Implementation based on the algorithm by Kazimierz M. Borkowski
 * for efficient conversion.
 */

const PERSIAN_MONTHS = [
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
  'اسفند'
];

/**
 * Converts a Gregorian date to a Persian (Jalali) date array.
 * @param {Date} gregorianDate - The Gregorian date to convert.
 * @returns {Array} An array [year, month, day] in Persian calendar.
 */
function gregorianToJalali(gy, gm, gd) {
  let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (~~((gy2 + 3) / 4)) - (~~((gy2 + 99) / 100)) + (~~((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (~~(days / 12053));
  days %= 12053;
  jy += 4 * (~~(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += (~~((days - 1) / 365));
    days = (days - 1) % 365;
  }
  let jm = (days < 186) ? 1 + (~~(days / 31)) : 7 + (~~((days - 186) / 30));
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

/**
 * Formats a Persian date into a readable string.
 * @param {number} year - Persian year.
 * @param {number} month - Persian month (1-12).
 * @param {number} day - Persian day.
 * @param {string} [format='default'] - Format style.
 * @returns {string} Formatted Persian date string.
 */
function formatJalaliDate(year, month, day, format = 'default') {
  const monthName = PERSIAN_MONTHS[month - 1] || 'Unknown';
  
  if (format === 'iso') {
    return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  }
  
  // Default format: "1 فروردین 1403" or similar
  return `${day} ${monthName} ${year}`;
}

/**
 * Converts a JavaScript Date object to a Persian Jalali string.
 * @param {Date} date - The Gregorian date to convert.
 * @param {string} [format='default'] - The output format.
 * @returns {string} The formatted Persian Jalali date string.
 */
export function toJalaliString(date, format = 'default') {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided');
  }

  const gy = date.getUTCFullYear();
  const gm = date.getUTCMonth() + 1; // getUTCMonth is 0-indexed
  const gd = date.getUTCDate();

  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  return formatJalaliDate(jy, jm, jd, format);
}

/**
 * Utility to get just the components.
 * @param {Date} date 
 * @returns {{ year: number, month: number, day: number, monthName: string }}
 */
export function getJalaliComponents(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided');
  }

  const gy = date.getUTCFullYear();
  const gm = date.getUTCMonth() + 1;
  const gd = date.getUTCDate();

  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  
  return {
    year: jy,
    month: jm,
    day: jd,
    monthName: PERSIAN_MONTHS[jm - 1]
  };
}