import {
  gregorianToJalali,
  jalaliToGregorian,
  formatPersianDate,
  getCurrentPersianDate,
  isPersianLeapYear,
  getPersianMonthDays
} from './index';

describe('Persian Date Utilities', () => {
  describe('gregorianToJalali', () => {
    test('converts known dates correctly', () => {
      // Nowruz 1403 = March 20, 2024
      expect(gregorianToJalali(new Date('2024-03-20'))).toEqual({ year: 1403, month: 1, day: 1 });
      
      // March 21, 2024
      expect(gregorianToJalali(new Date('2024-03-21'))).toEqual({ year: 1403, month: 1, day: 2 });
      
      // January 1, 2024
      expect(gregorianToJalali(new Date('2024-01-01'))).toEqual({ year: 1402, month: 10, day: 11 });
      
      // December 31, 2024
      expect(gregorianToJalali(new Date('2024-12-31'))).toEqual({ year: 1403, month: 10, day: 10 });
    });

    test('handles leap year boundaries', () => {
      // Last day of 1402 (leap year) = March 19, 2024
      expect(gregorianToJalali(new Date('2024-03-19'))).toEqual({ year: 1402, month: 12, day: 30 });
    });
  });

  describe('jalaliToGregorian', () => {
    test('converts back to Gregorian correctly', () => {
      const jalali = { year: 1403, month: 1, day: 1 };
      const gregorian = jalaliToGregorian(jalali.year, jalali.month, jalali.day);
      expect(gregorianToJalali(gregorian)).toEqual(jalali);
    });

    test('round-trip conversion for multiple dates', () => {
      const testDates = [
        { year: 1400, month: 1, day: 1 },
        { year: 1402, month: 12, day: 30 },
        { year: 1403, month: 6, day: 15 },
        { year: 1399, month: 12, day: 29 },
      ];

      testDates.forEach(jalali => {
        const gregorian = jalaliToGregorian(jalali.year, jalali.month, jalali.day);
        const converted = gregorianToJalali(gregorian);
        expect(converted).toEqual(jalali);
      });
    });
  });

  describe('formatPersianDate', () => {
    const testDate: PersianDate = { year: 1403, month: 1, day: 15 };

    test('formats in Persian locale', () => {
      expect(formatPersianDate(testDate, { locale: 'fa', format: 'full' }))
        .toBe('۱۵ فروردین ۱۴۰۳');
      expect(formatPersianDate(testDate, { locale: 'fa', format: 'short' }))
        .toBe('۱۵ فروردین');
      expect(formatPersianDate(testDate, { locale: 'fa', format: 'numeric' }))
        .toBe('۱۴۰۳/۰۱/۱۵');
    });

    test('formats in English locale', () => {
      expect(formatPersianDate(testDate, { locale: 'en', format: 'full' }))
        .toBe('15 Farvardin 1403');
      expect(formatPersianDate(testDate, { locale: 'en', format: 'short' }))
        .toBe('15 Farvardin');
      expect(formatPersianDate(testDate, { locale: 'en', format: 'numeric' }))
        .toBe('1403/01/15');
    });

    test('includes weekday when requested', () => {
      const withWeekday = formatPersianDate(testDate, { locale: 'fa', format: 'full', showWeekday: true });
      expect(withWeekday).toMatch(/^(یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنج‌شنبه|جمعه|شنبه)، ۱۵ فروردین ۱۴۰۳$/);
    });
  });

  describe('isPersianLeapYear', () => {
    test('identifies leap years correctly', () => {
      // Known leap years in 33-year cycle
      expect(isPersianLeapYear(1403)).toBe(false);
      expect(isPersianLeapYear(1404)).toBe(true);  // cycle position 1
      expect(isPersianLeapYear(1399)).toBe(true);  // cycle position 30
    });
  });

  describe('getPersianMonthDays', () => {
    test('returns correct days for each month', () => {
      // First 6 months: 31 days
      for (let m = 1; m <= 6; m++) {
        expect(getPersianMonthDays(1403, m)).toBe(31);
      }
      // Months 7-11: 30 days
      for (let m = 7; m <= 11; m++) {
        expect(getPersianMonthDays(1403, m)).toBe(30);
      }
      // Month 12: 29 days in non-leap year, 30 in leap year
      expect(getPersianMonthDays(1403, 12)).toBe(29);
      expect(getPersianMonthDays(1404, 12)).toBe(30);
    });
  });

  describe('getCurrentPersianDate', () => {
    test('returns a valid Persian date', () => {
      const current = getCurrentPersianDate();
      expect(current.year).toBeGreaterThan(1400);
      expect(current.month).toBeGreaterThanOrEqual(1);
      expect(current.month).toBeLessThanOrEqual(12);
      expect(current.day).toBeGreaterThanOrEqual(1);
      expect(current.day).toBeLessThanOrEqual(31);
    });
  });
});