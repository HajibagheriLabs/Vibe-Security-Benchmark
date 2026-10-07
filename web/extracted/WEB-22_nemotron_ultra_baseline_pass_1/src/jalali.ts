import { JALALI_LOCALES, GREGORIAN_EPOCH, JALALI_EPOCH, JALALI_MONTH_DAYS } from './constants';
import type { JalaliDate, JalaliFormatOptions, JalaliLocale } from './types';

function toPersianDigits(num: number | string, digits: string[]): string {
  return String(num).replace(/\d/g, (d) => digits[parseInt(d, 10)]);
}

function isLeapJalaliYear(year: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const gy = year + 621;
  let leapJ = -14;
  let jp = breaks[0];
  
  if (year < jp || year >= breaks[breaks.length - 1]) {
    throw new Error('Invalid Jalali year');
  }
  
  for (let i = 1; i < breaks.length; i++) {
    const jm = breaks[i];
    const jump = jm - jp;
    if (year < jm) break;
    leapJ += jump / 33 * 8 + jump % 33 / 4;
    jp = jm;
  }
  
  const n = year - jp;
  leapJ += n / 33 * 8 + (n % 33 + 3) / 4;
  if (jump % 33 === 4 && jump - n === 4) leapJ++;
  
  return (leapJ % 33) * 4 + 3 === n * 4 + 3;
}

function jalaliToJDN(year: number, month: number, day: number): number {
  const epbase = year - 474;
  const epyear = 474 + (epbase % 2820);
  let days = day;
  
  if (month <= 7) {
    days += (month - 1) * 31;
  } else {
    days += 186 + (month - 7) * 30;
  }
  
  days += Math.floor((epyear * 682 - 110) / 2816) + (epyear - 1) * 365 + Math.floor(epbase / 2820) * 1029983 + (JALALI_EPOCH - 1);
  
  return days;
}

function jdnToJalali(jdn: number): JalaliDate {
  const depoch = jdn - JALALI_EPOCH;
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
  let yday = jdn - jalaliToJDN(year, 1, 1) + 1;
  
  let month: number;
  let day: number;
  
  if (yday <= 186) {
    month = Math.ceil(yday / 31);
    day = yday - (month - 1) * 31;
  } else {
    yday -= 186;
    month = Math.ceil(yday / 30) + 6;
    day = yday - (month - 7) * 30;
  }
  
  return { year, month, day };
}

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function toJalali(date: Date | number | string): JalaliDate {
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  const jdn = gregorianToJDN(year, month, day);
  return jdnToJalali(jdn);
}

export function formatJalali(
  date: Date | number | string | JalaliDate,
  options: JalaliFormatOptions = {}
): string {
  const jalali = 'year' in date ? date : toJalali(date);
  const locale = options.locale || 'fa';
  const localeData = JALALI_LOCALES[locale];
  const { showWeekday = false, format = 'full', customPattern, separator = '/' } = options;
  
  const yearStr = toPersianDigits(jalali.year, localeData.digits);
  const monthStr = toPersianDigits(jalali.month, localeData.digits).padStart(2, localeData.digits[0]);
  const dayStr = toPersianDigits(jalali.day, localeData.digits).padStart(2, localeData.digits[0]);
  const monthName = localeData.months[jalali.month - 1];
  
  let result = '';
  
  if (customPattern) {
    result = customPattern
      .replace('YYYY', yearStr)
      .replace('YY', yearStr.slice(-2))
      .replace('MMMM', monthName)
      .replace('MM', monthStr)
      .replace('M', toPersianDigits(jalali.month, localeData.digits))
      .replace('DD', dayStr)
      .replace('D', toPersianDigits(jalali.day, localeData.digits));
  } else {
    switch (format) {
      case 'numeric':
        result = `${yearStr}${separator}${monthStr}${separator}${dayStr}`;
        break;
      case 'short':
        result = `${dayStr} ${monthName.slice(0, 3)} ${yearStr}`;
        break;
      case 'full':
      default:
        result = `${dayStr} ${monthName} ${yearStr}`;
        break;
    }
  }
  
  if (showWeekday) {
    const gregorianDate = date instanceof Date ? date : new Date(date);
    const weekday = gregorianDate.getDay();
    const weekdayName = localeData.weekdays[weekday];
    result = `${weekdayName}، ${result}`;
  }
  
  return result;
}

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface JalaliContextValue {
  locale: 'fa' | 'en';
  setLocale: (locale: 'fa' | 'en') => void;
  formatDate: (date: Date | number | string, options?: JalaliFormatOptions) => string;
}

const JalaliContext = createContext<JalaliContextValue | null>(null);

interface JalaliDateProviderProps {
  children: ReactNode;
  defaultLocale?: 'fa' | 'en';
}

export function JalaliDateProvider({ children, defaultLocale = 'fa' }: JalaliDateProviderProps) {
  const [locale, setLocale] = useState<'fa' | 'en'>(defaultLocale);
  
  const formatDate = useCallback(
    (date: Date | number | string, options: JalaliFormatOptions = {}) => {
      return formatJalali(date, { ...options, locale });
    },
    [locale]
  );
  
  return (
    <JalaliContext.Provider value={{ locale, setLocale, formatDate }}>
      {children}
    </JalaliContext.Provider>
  );
}

export function useJalaliLocale(): { locale: 'fa' | 'en'; setLocale: (locale: 'fa' | 'en') => void } {
  const context = useContext(JalaliContext);
  if (!context) {
    throw new Error('useJalaliLocale must be used within a JalaliDateProvider');
  }
  return { locale: context.locale, setLocale: context.setLocale };
}

export function useJalaliDate(date: Date | number | string, options: JalaliFormatOptions = {}): string {
  const context = useContext(JalaliContext);
  const locale = context?.locale ?? 'fa';
  return formatJalali(date, { ...options, locale });
}