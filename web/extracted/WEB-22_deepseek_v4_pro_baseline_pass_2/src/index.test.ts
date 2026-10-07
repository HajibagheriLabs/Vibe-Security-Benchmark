import { renderHook } from '@testing-library/react';
import {
  gregorianToJalali,
  dateToJalali,
  formatJalaliDate,
  formatGregorianAsJalali,
  getPersianWeekday,
  useJalaliDate,
  useJalaliDateObject,
  useJalaliFullDate,
} from './index';

describe('gregorianToJalali', () => {
  it('converts a known date correctly', () => {
    // March 21, 2024 = 1 Farvardin 1403 (Nowruz)
    const result = gregorianToJalali(2024, 3, 21);
    expect(result).toEqual({ year: 1403, month: 1, day: 1 });
  });

  it('converts another known date correctly', () => {
    // January 1, 2024 = 11 Dey 1402
    const result = gregorianToJalali(2024, 1, 1);
    expect(result).toEqual({ year: 1402, month: 10, day: 11 });
  });

  it('converts a mid-year date correctly', () => {
    // July 15, 2023 = 24 Tir 1402
    const result = gregorianToJalali(2023, 7, 15);
    expect(result).toEqual({ year: 1402, month: 4, day: 24 });
  });

  it('throws on invalid month', () => {
    expect(() => gregorianToJalali(2024, 13, 1)).toThrow(RangeError);
  });

  it('throws on invalid day', () => {
    expect(() => gregorianToJalali(2024, 1, 32)).toThrow(RangeError);
  });
});

describe('dateToJalali', () => {
  it('converts a Date object', () => {
    const date = new Date(2024, 2, 21); // March 21, 2024
    const result = dateToJalali(date);
    expect(result).toEqual({ year: 1403, month: 1, day: 1 });
  });
});

describe('formatJalaliDate', () => {
  const jalali = { year: 1403, month: 1, day: 5 };

  it('formats with default options', () => {
    expect(formatJalaliDate(jalali)).toBe('1403/01/05');
  });

  it('formats with custom separator', () => {
    expect(formatJalaliDate(jalali, { separator: '-' })).toBe('1403-01-05');
  });

  it('formats with Persian digits', () => {
    expect(formatJalaliDate(jalali, { usePersianDigits: true })).toBe('۱۴۰۳/۰۱/۰۵');
  });

  it('formats with long month names', () => {
    expect(formatJalaliDate(jalali, { monthFormat: 'long' })).toBe('1403/فروردین/05');
  });
});

describe('formatGregorianAsJalali', () => {
  it('formats a Date object', () => {
    const date = new Date(2024, 2, 21);
    expect(formatGregorianAsJalali(date)).toBe('1403/01/01');
  });
});

describe('getPersianWeekday', () => {
  it('returns correct weekday for a known date', () => {
    // March 21, 2024 is a Thursday (پنجشنبه)
    const date = new Date(2024, 2, 21);
    expect(getPersianWeekday(date)).toBe('پنجشنبه');
  });
});

describe('React hooks', () => {
  it('useJalaliDate returns formatted string', () => {
    const date = new Date(2024, 2, 21);
    const { result } = renderHook(() => useJalaliDate(date));
    expect(result.current).toBe('1403/01/01');
  });

  it('useJalaliDate returns empty string for null', () => {
    const { result } = renderHook(() => useJalaliDate(null));
    expect(result.current).toBe('');
  });

  it('useJalaliDateObject returns JalaliDate object', () => {
    const date = new Date(2024, 2, 21);
    const { result } = renderHook(() => useJalaliDateObject(date));
    expect(result.current).toEqual({ year: 1403, month: 1, day: 1 });
  });

  it('useJalaliFullDate returns weekday + date', () => {
    const date = new Date(2024, 2, 21);
    const { result } = renderHook(() => useJalaliFullDate(date));
    expect(result.current).toContain('پنجشنبه');
    expect(result.current).toContain('فروردین');
  });
});