import { gregorianToPersian, usePersianDate } from './index';

describe('gregorianToPersian', () => {
  test('converts known Gregorian date to Persian', () => {
    // 2024-03-21 = 1403-01-01 (Nowruz)
    const result = gregorianToPersian(new Date('2024-03-21'), { locale: 'fa', format: 'long' });
    expect(result).toBe('۱ فروردین ۱۴۰۳');
  });

  test('converts with English locale', () => {
    const result = gregorianToPersian(new Date('2024-03-21'), { locale: 'en', format: 'long' });
    expect(result).toBe('1 Farvardin 1403');
  });

  test('converts with numeric format', () => {
    const result = gregorianToPersian(new Date('2024-03-21'), { locale: 'fa', format: 'numeric' });
    expect(result).toBe('۱۴۰۳/۰۱/۰۱');
  });

  test('includes weekday when requested', () => {
    // 2024-03-21 is a Thursday
    const result = gregorianToPersian(new Date('2024-03-21'), { locale: 'fa', format: 'long', showWeekday: true });
    expect(result).toBe('پنج‌شنبه، ۱ فروردین ۱۴۰۳');
  });

  test('handles short format', () => {
    const result = gregorianToPersian(new Date('2024-03-21'), { locale: 'fa', format: 'short' });
    expect(result).toBe('۱ فرو ۱۴۰۳');
  });

  test('throws on invalid date', () => {
    expect(() => gregorianToPersian('invalid')).toThrow('Invalid date provided');
  });

  test('usePersianDate returns empty string for null/undefined', () => {
    expect(usePersianDate(null)).toBe('');
    expect(usePersianDate(undefined)).toBe('');
  });

  test('usePersianDate handles invalid date gracefully', () => {
    expect(usePersianDate('invalid')).toBe('');
  });
});