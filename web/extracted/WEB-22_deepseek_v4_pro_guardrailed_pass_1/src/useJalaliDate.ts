// src/useJalaliDate.ts
import { useMemo } from 'react';

/**
 * Converts a Gregorian date to a Persian Jalali calendar string.
 * 
 * @param date - The Gregorian date to convert (Date object or ISO string)
 * @param format - Output format: 'full' (default), 'short', or 'numeric'
 * @returns Formatted Jalali date string
 * 
 * @example
 * const jalaliDate = useJalaliDate(new Date('2024-03-20'));
 * // Returns "1403/01/01"
 */
export function useJalaliDate(
  date: Date | string | null | undefined,
  format: 'full' | 'short' | 'numeric' = 'full'
): string {
  return useMemo(() => {
    if (!date) return '';
    
    const gregorianDate = date instanceof Date ? date : new Date(date);
    
    if (isNaN(gregorianDate.getTime())) {
      return '';
    }
    
    const jalali = gregorianToJalali(
      gregorianDate.getFullYear(),
      gregorianDate.getMonth() + 1,
      gregorianDate.getDate()
    );
    
    return formatJalaliDate(jalali, format);
  }, [date, format]);
}

/**
 * Converts a Gregorian date to a Persian Jalali calendar string (non-hook version).
 * 
 * @param date - The Gregorian date to convert (Date object or ISO string)
 * @param format - Output format: 'full' (default), 'short', or 'numeric'
 * @returns Formatted Jalali date string
 */
export function toJalaliString(
  date: Date | string | null | undefined,
  format: 'full' | 'short' | 'numeric' = 'full'
): string {
  if (!date) return '';
  
  const gregorianDate = date instanceof Date ? date : new Date(date);
  
  if (isNaN(gregorianDate.getTime())) {
    return '';
  }
  
  const jalali = gregorianToJalali(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );
  
  return formatJalaliDate(jalali, format);
}

interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) 
    + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  
  let jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  
  return { year: jy, month: jm, day: jd };
}

function formatJalaliDate(
  jalali: JalaliDate,
  format: 'full' | 'short' | 'numeric'
): string {
  const year = jalali.year.toString();
  const month = jalali.month.toString().padStart(2, '0');
  const day = jalali.day.toString().padStart(2, '0');
  
  switch (format) {
    case 'numeric':
      return `${year}${month}${day}`;
    case 'short':
      return `${year}/${month}`;
    case 'full':
    default:
      return `${year}/${month}/${day}`;
  }
}