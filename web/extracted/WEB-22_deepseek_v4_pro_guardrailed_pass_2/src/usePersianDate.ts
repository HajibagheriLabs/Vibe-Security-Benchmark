// src/usePersianDate.ts
import { useMemo } from 'react';

/**
 * Converts a Gregorian Date to a Persian Jalali calendar string.
 * 
 * @param date - The Gregorian date to convert
 * @param format - Optional format string. Default: 'YYYY/MM/DD'
 *                 Supported tokens: YYYY (full year), MM (month), DD (day)
 * @returns Persian Jalali date string
 * 
 * @example
 * const persianDate = usePersianDate(new Date('2024-03-20'));
 * // Returns: "1403/01/01"
 */
export function usePersianDate(date: Date | null | undefined, format: string = 'YYYY/MM/DD'): string {
  return useMemo(() => {
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    return gregorianToJalali(date, format);
  }, [date, format]);
}

/**
 * Core conversion function that converts a Gregorian Date to Persian Jalali calendar.
 * 
 * @param date - The Gregorian date to convert
 * @param format - Optional format string. Default: 'YYYY/MM/DD'
 * @returns Persian Jalali date string
 */
export function gregorianToJalali(date: Date, format: string = 'YYYY/MM/DD'): string {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
  const gDay = date.getDate();

  // Convert Gregorian to Julian Day Number
  const jdn = gregorianToJdn(gYear, gMonth, gDay);
  
  // Convert Julian Day Number to Jalali
  const { jYear, jMonth, jDay } = jdnToJalali(jdn);

  return formatJalaliDate(jYear, jMonth, jDay, format);
}

/**
 * Converts Gregorian date to Julian Day Number.
 */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + 
         Math.floor(y / 4) - Math.floor(y / 100) + 
         Math.floor(y / 400) - 32045;
}

/**
 * Converts Julian Day Number to Jalali date.
 */
function jdnToJalali(jdn: number): { jYear: number; jMonth: number; jDay: number } {
  const depoch = jdn - jalaliToJdn(475, 1, 1);
  const cycle = Math.floor(depoch / 1029983);
  const cyear = depoch % 1029983;
  
  let ycycle: number;
  if (cyear === 1029982) {
    ycycle = 2820;
  } else {
    const aux1 = Math.floor(cyear / 366);
    const aux2 = cyear % 366;
    ycycle = Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
  }
  
  let year = ycycle + 2820 * cycle + 474;
  if (year <= 0) {
    year -= 1;
  }
  
  const yday = jdn - jalaliToJdn(year, 1, 1) + 1;
  const month = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
  const day = jdn - jalaliToJdn(year, month, 1) + 1;
  
  return { jYear: year, jMonth: month, jDay: day };
}

/**
 * Converts Jalali date to Julian Day Number.
 */
function jalaliToJdn(year: number, month: number, day: number): number {
  const epbase = year - (year >= 0 ? 474 : 473);
  const epyear = 474 + (epbase % 2820);
  
  const jdn = day + 
              (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) + 
              Math.floor((epyear * 682 - 110) / 2816) + 
              (epyear - 1) * 365 + 
              Math.floor(epbase / 2820) * 1029983 + 
              (1948320.5 - 1);
  
  return Math.floor(jdn);
}

/**
 * Formats the Jalali date according to the specified format string.
 */
function formatJalaliDate(year: number, month: number, day: number, format: string): string {
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', monthStr)
    .replace('DD', dayStr);
}