export interface PersianDateOptions {
  locale?: 'fa' | 'en';
  format?: 'short' | 'long' | 'full';
  showWeekday?: boolean;
}

export interface PersianDateParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
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
  'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
];

const WEEKDAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

function isLeapYear(year: number): boolean {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
  ];
  
  let leapCount = 0;
  for (const br of breaks) {
    if (year >= br) leapCount++;
    else break;
  }
  
  return (leapCount % 33) % 4 === 0;
}

function gregorianToJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function julianDayToPersian(jdn: number): PersianDateParts {
  const depoch = jdn - gregorianToJulianDay(1600, 3, 21);
  const cycle = Math.floor(depoch / 1029983);
  let cyear = depoch % 1029983;
  
  if (cyear === 1029982) {
    cyear = 2820;
  } else {
    const aux1 = Math.floor(cyear / 366);
    const aux2 = cyear % 366;
    cyear = Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
  }
  
  const year = cyear + 2820 * cycle + 474;
  const yday = jdn - gregorianToJulianDay(year, 3, 21);
  
  let month: number;
  let day: number;
  
  if (yday < 186) {
    month = Math.ceil(yday / 31);
    day = yday - (month - 1) * 31 + 1;
  } else {
    month = Math.ceil((yday - 6) / 30);
    day = yday - (month - 1) * 30 - 6 + 1;
  }
  
  const weekday = (jdn + 1) % 7;
  
  return { year, month, day, weekday };
}

export function gregorianToPersian(date: Date | number | string): PersianDateParts {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const jdn = gregorianToJulianDay(year, month, day);
  return julianDayToPersian(jdn);
}

export function formatPersianDate(
  date: Date | number | string,
  options: PersianDateOptions = {}
): string {
  const { locale = 'fa', format = 'long', showWeekday = false } = options;
  const parts = gregorianToPersian(date);
  
  const months = locale === 'fa' ? PERSIAN_MONTHS_FA : PERSIAN_MONTHS_EN;
  const weekdays = locale === 'fa' ? WEEKDAYS_FA : WEEKDAYS_EN;
  const usePersianDigits = locale === 'fa';
  
  const formatNumber = usePersianDigits ? toPersianDigits : String;
  const monthName = months[parts.month - 1];
  
  let result = '';
  
  if (showWeekday) {
    result += weekdays[parts.weekday] + '، ';
  }
  
  switch (format) {
    case 'short':
      result += `${formatNumber(parts.day)} ${monthName.slice(0, 3)} ${formatNumber(parts.year)}`;
      break;
    case 'long':
      result += `${formatNumber(parts.day)} ${monthName} ${formatNumber(parts.year)}`;
      break;
    case 'full':
      result += `${formatNumber(parts.day)} ${monthName} ${formatNumber(parts.year)}`;
      break;
  }
  
  return result;
}

export function usePersianDate(
  date: Date | number | string | null | undefined,
  options: PersianDateOptions = {}
): string {
  if (!date) return '';
  return formatPersianDate(date, options);
}

export { PERSIAN_MONTHS_FA, PERSIAN_MONTHS_EN, WEEKDAYS_FA, WEEKDAYS_EN };