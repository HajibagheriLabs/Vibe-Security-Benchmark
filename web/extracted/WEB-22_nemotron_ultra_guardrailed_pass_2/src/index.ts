import { toJalaali } from 'jalaali-js';

export interface PersianDateOptions {
  locale?: 'fa' | 'en';
  format?: 'short' | 'long' | 'numeric';
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

const PERSIAN_WEEKDAYS_FA = [
  'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
];

const PERSIAN_WEEKDAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

function getWeekday(date: Date): number {
  // JavaScript: 0=Sunday, 6=Saturday
  // Jalali: 0=Saturday, 6=Friday (but we'll use JS convention)
  return date.getDay();
}

export function gregorianToPersian(
  date: Date | string | number,
  options: PersianDateOptions = {}
): string {
  const { locale = 'fa', format = 'long', showWeekday = false } = options;
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }

  const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  
  const months = locale === 'fa' ? PERSIAN_MONTHS_FA : PERSIAN_MONTHS_EN;
  const weekdays = locale === 'fa' ? PERSIAN_WEEKDAYS_FA : PERSIAN_WEEKDAYS_EN;
  
  const monthName = months[jm - 1];
  const day = locale === 'fa' ? toPersianDigits(jd) : String(jd);
  const year = locale === 'fa' ? toPersianDigits(jy) : String(jy);
  
  let result = '';
  
  if (showWeekday) {
    const weekday = weekdays[getWeekday(d)];
    result += `${weekday}، `;
  }
  
  switch (format) {
    case 'short':
      result += `${day} ${monthName.slice(0, 3)} ${year}`;
      break;
    case 'numeric':
      const monthNum = locale === 'fa' ? toPersianDigits(jm) : String(jm).padStart(2, '0');
      const dayNum = locale === 'fa' ? toPersianDigits(jd).padStart(2, '0') : String(jd).padStart(2, '0');
      result += `${year}/${monthNum}/${dayNum}`;
      break;
    case 'long':
    default:
      result += `${day} ${monthName} ${year}`;
      break;
  }
  
  return result;
}

export function usePersianDate(
  date: Date | string | number | null | undefined,
  options: PersianDateOptions = {}
): string {
  if (!date) return '';
  try {
    return gregorianToPersian(date, options);
  } catch {
    return '';
  }
}

export { toJalaali } from 'jalaali-js';