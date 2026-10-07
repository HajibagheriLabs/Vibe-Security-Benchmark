// src/jalaliConverter.ts
import { toJalaali, jalaaliMonthNames, jalaaliDayNames } from 'jalaali-js';

/**
 * Converts a Gregorian Date object to a Persian Jalali string.
 * 
 * @param {Date} date - The Gregorian date to convert.
 * @returns {string} A formatted string: "DayOfWeek, Day MonthName Year".
 *                    Example: "دوشنبه، ۱ فروردین ۱۴۰۳"
 */
export function convertToJalali(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Gregorian date provided');
  }

  // Extract Jalaali components
  const jDate = toJalaali(date);
  const { jy, jm, jd } = jDate;

  // Map month index (1-12) to Jalaali month name
  const monthName = jalaaliMonthNames[jm - 1] || 'نامشخص';

  // Map day of week (1-7, where 1 is Saturday in Jalaali/IR standard)
  // toJalaali doesn't directly give day of week, so we calculate it from the Date object.
  // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // Jalaali week: 1=Sat, 2=Sun, ..., 7=Fri
  const jsDayOfWeek = date.getDay(); // 0-6
  const jalaaliDayIndex = jsDayOfWeek === 0 ? 1 : jsDayOfWeek + 1; // Map to 1-7
  
  const dayName = jalaaliDayNames[jalaaliDayIndex - 1] || 'نامشخص';

  // Convert numbers to Persian digits for local formatting
  const persianDigits = (num: number) => num.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

  return `${dayName}، ${persianDigits(jd)} ${monthName} ${persianDigits(jy)}`;
}