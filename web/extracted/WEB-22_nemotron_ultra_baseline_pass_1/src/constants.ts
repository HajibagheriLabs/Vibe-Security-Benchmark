import type { JalaliLocale } from './types';

export const JALALI_LOCALES: Record<'fa' | 'en', JalaliLocale> = {
  fa: {
    months: [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ],
    weekdays: [
      'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
    ],
    digits: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  },
  en: {
    months: [
      'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
      'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'
    ],
    weekdays: [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ],
    digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  }
};

export const GREGORIAN_EPOCH = 1721425.5;
export const JALALI_EPOCH = 1948320.5;
export const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];