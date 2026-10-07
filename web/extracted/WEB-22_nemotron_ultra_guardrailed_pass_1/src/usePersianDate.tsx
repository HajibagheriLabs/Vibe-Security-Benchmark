import { useMemo } from 'react';
import { gregorianToJalali, formatPersianDate, PersianDateStringOptions } from './index';

/**
 * React hook for converting Gregorian dates to formatted Persian Jalali strings
 * 
 * @param date - The Gregorian date to convert (Date object, timestamp, or ISO string)
 * @param options - Formatting options
 * @returns Formatted Persian date string
 * 
 * @example
 * ```tsx
 * const persianDate = usePersianDate(new Date(), { locale: 'fa', format: 'full' });
 * // Returns: "۱۵ فروردین ۱۴۰۳"
 * ```
 */
export function usePersianDate(
  date: Date | number | string | null | undefined,
  options: PersianDateStringOptions = {}
): string {
  return useMemo(() => {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      console.warn('usePersianDate: Invalid date provided');
      return '';
    }
    
    const persianDate = gregorianToJalali(dateObj);
    return formatPersianDate(persianDate, options);
  }, [date, options.locale, options.format, options.showWeekday]);
}

/**
 * Hook for getting current Persian date with auto-refresh
 */
export function useCurrentPersianDate(options: PersianDateStringOptions = {}): string {
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return usePersianDate(new Date(), options);
}

// Need to import useState and useEffect
import { useState, useEffect } from 'react';