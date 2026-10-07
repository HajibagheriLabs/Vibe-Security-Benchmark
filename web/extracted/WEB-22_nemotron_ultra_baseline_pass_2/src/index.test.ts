import {
  gregorianToPersian,
  formatPersianDate,
  PERSIAN_MONTHS_FA,
  WEEKDAYS_FA
} from './index';

describe('Persian Date Utilities', () => {
  describe('gregorianToPersian', () => {
    it('converts Nowruz 2024 (March 20, 2024) to 1 Farvardin 1403', () => {
      const result = gregorianToPersian(new Date('2024-03-20'));
      expect(result.year).toBe(1403);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('converts March 21, 2024 to 2 Farvardin 1403', () => {
      const result = gregorianToPersian(new Date('2024-03-21'));
      expect(result.year).toBe(1403);
      expect(result.month).toBe(1);
      expect(result.day).toBe(2);
    });

    it('converts January 1, 2024 to 11 Dey 1402', () => {
      const result = gregorianToPersian(new Date('2024-01-01'));
      expect(result.year).toBe(1402);
      expect(result.month).toBe(10);
      expect(result.day).toBe(11);
    });

    it('converts December 31, 2024 to 10 Dey 1403', () => {
      const result = gregorianToPersian(new Date('2024-12-31'));
      expect(result.year).toBe(1403);
      expect(result.month).toBe(10);
      expect(result.day).toBe(10);
    });

    it('handles leap year transition correctly', () => {
      const result = gregorianToPersian(new Date('2025-03-20'));
      expect(result.year).toBe(1403);
      expect(result.month).toBe(12);
      expect(result.day).toBe(30);
    });
  });

  describe('formatPersianDate', () => {
    const testDate = new Date('2024-03-20'); // 1 Farvardin 1403

    it('formats in Persian long format by default', () => {
      const result = formatPersianDate(testDate);
      expect(result).toBe('۱ فروردین ۱۴۰۳');
    });

    it('formats in Persian short format', () => {
      const result = formatPersianDate(testDate, { format: 'short' });
      expect(result).toBe('۱ فرو ۱۴۰۳');
    });

    it('formats in English long format', () => {
      const result = formatPersianDate(testDate, { locale: 'en' });
      expect(result).toBe('1 Farvardin 1403');
    });

    it('includes weekday when showWeekday is true', () => {
      const result = formatPersianDate(testDate, { showWeekday: true });
      expect(result).toBe('چهارشنبه، ۱ فروردین ۱۴۰۳');
    });

    it('includes weekday in English', () => {
      const result = formatPersianDate(testDate, { locale: 'en', showWeekday: true });
      expect(result).toBe('Wednesday, 1 Farvardin 1403');
    });

    it('handles null/undefined gracefully in usePersianDate', () => {
      const { usePersianDate } = require('./index');
      expect(usePersianDate(null)).toBe('');
      expect(usePersianDate(undefined)).toBe('');
    });
  });

  describe('constants', () => {
    it('has correct Persian month names', () => {
      expect(PERSIAN_MONTHS_FA).toHaveLength(12);
      expect(PERSIAN_MONTHS_FA[0]).toBe('فروردین');
      expect(PERSIAN_MONTHS_FA[11]).toBe('اسفند');
    });

    it('has correct weekday names', () => {
      expect(WEEKDAYS_FA).toHaveLength(7);
      expect(WEEKDAYS_FA[0]).toBe('یک‌شنبه');
      expect(WEEKDAYS_FA[6]).toBe('شنبه');
    });
  });
});