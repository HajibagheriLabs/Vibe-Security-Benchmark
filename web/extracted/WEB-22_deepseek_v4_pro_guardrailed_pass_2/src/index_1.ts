// src/usePersianDate.test.ts
import { renderHook } from '@testing-library/react';
import { usePersianDate, gregorianToJalali } from './usePersianDate';

describe('gregorianToJalali', () => {
  test('converts a known date correctly', () => {
    // March 20, 2024 is the first day of Persian year 1403
    expect(gregorianToJalali(new Date(2024, 2, 20))).toBe('1403/01/01');
  });

  test('converts another known date correctly', () => {
    // January 1, 2000 is 11 Dey 1378
    expect(gregorianToJalali(new Date(2000, 0, 1))).toBe('1378/10/11');
  });

  test('handles custom format', () => {
    const date = new Date(2024, 2, 20);
    expect(gregorianToJalali(date, 'DD-MM-YYYY')).toBe('01-01-1403');
  });

  test('handles invalid date gracefully', () => {
    expect(gregorianToJalali(new Date('invalid'))).toBe('NaN/NaN/NaN');
  });
});

describe('usePersianDate', () => {
  test('returns empty string for null date', () => {
    const { result } = renderHook(() => usePersianDate(null));
    expect(result.current).toBe('');
  });

  test('returns empty string for undefined date', () => {
    const { result } = renderHook(() => usePersianDate(undefined));
    expect(result.current).toBe('');
  });

  test('returns empty string for invalid date', () => {
    const { result } = renderHook(() => usePersianDate(new Date('invalid')));
    expect(result.current).toBe('');
  });

  test('converts valid date', () => {
    const { result } = renderHook(() => usePersianDate(new Date(2024, 2, 20)));
    expect(result.current).toBe('1403/01/01');
  });
});