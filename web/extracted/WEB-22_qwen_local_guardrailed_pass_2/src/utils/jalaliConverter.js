// src/utils/jalaliConverter.js
import { format } from 'date-fns-jalali';
import { parseISO, isValid } from 'date-fns';

/**
 * Converts a Gregorian date string (ISO 8601) to a Persian Jalali string.
 * 
 * @param {string} isoString - The ISO 8601 date string (e.g., "2023-10-26T12:00:00Z").
 * @param {string} [formatStr='jYYYY/jMM/jDD'] - The desired output format using Jalali tokens.
 * @returns {string} The formatted Jalali date string.
 * @throws {Error} If the input is invalid.
 */
export function toJalaliString(isoString, formatStr = 'jYYYY/jMM/jDD') {
  if (!isoString) {
    throw new Error('ISO string is required');
  }

  const date = parseISO(isoString);

  if (!isValid(date)) {
    throw new Error(`Invalid date: ${isoString}`);
  }

  // date-fns-jalali uses 'j' prefix for Jalali tokens (jYYYY, jMM, jDD, etc.)
  return format(date, formatStr);
}

/**
 * React Hook to get current Jalali date string.
 * 
 * @returns {string} Current Jalali date string.
 */
export function useCurrentJalaliDate(formatStr = 'jYYYY/jMM/jDD') {
  const now = new Date();
  return format(now, formatStr);
}