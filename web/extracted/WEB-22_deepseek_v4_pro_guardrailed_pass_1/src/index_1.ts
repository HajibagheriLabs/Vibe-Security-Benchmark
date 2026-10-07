// src/__tests__/useJalaliDate.test.ts
import { renderHook } from '@testing-library/react';
import { useJalaliDate, toJalaliString } from '../useJalaliDate';

describe('Jalali date conversion', () => {
  test('converts Gregorian to Jalali correctly', () => {
    // March 20, 2024 = 1403/01/01 (Nowruz)
    expect(toJalaliString(new Date(2024, 2, 20))).toBe('1403/01/01');
    
    // January 1, 2024 = 1402/10/11
    expect(toJalaliString(new Date(2024, 0, 1))).toBe('1402/10/11');
    
    // December 31, 2023 = 1402/10/10
    expect(toJalaliString(new Date(2023, 11, 31))).toBe('1402/10/10');
  });
  
  test('handles different formats', () => {
    const date = new Date(2024, 2, 20);
    
    expect(toJalaliString(date, 'full')).toBe('1403/01/01');
    expect(toJalaliString(date, 'short')).toBe('1403/01');
    expect(toJalaliString(date, 'numeric')).toBe('14030101');
  });
  
  test('handles null and undefined', () => {
    expect(toJalaliString(null)).toBe('');
    expect(toJalaliString(undefined)).toBe('');
  });
  
  test('handles invalid dates', () => {
    expect(toJalaliString('invalid-date')).toBe('');
    expect(toJalaliString(new Date('invalid'))).toBe('');
  });
  
  test('works as a React hook', () => {
    const { result } = renderHook(() => useJalaliDate(new Date(2024, 2, 20)));
    expect(result.current).toBe('1403/01/01');
  });
});