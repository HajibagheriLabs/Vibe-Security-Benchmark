import { toJalali, formatJalali } from './jalali';

describe('toJalali', () => {
  test('converts known Gregorian dates to Jalali', () => {
    expect(toJalali(new Date('2024-03-20'))).toEqual({ year: 1402, month: 12, day: 30 });
    expect(toJalali(new Date('2024-03-21'))).toEqual({ year: 1403, month: 1, day: 1 });
    expect(toJalali(new Date('2023-03-21'))).toEqual({ year: 1401, month: 12, day: 30 });
    expect(toJalali(new Date('2023-03-22'))).toEqual({ year: 1402, month: 1, day: 1 });
  });

  test('handles leap year transitions', () => {
    expect(toJalali(new Date('2020-03-19'))).toEqual({ year: 1398, month: 12, day: 29 });
    expect(toJalali(new Date('2020-03-20'))).toEqual({ year: 1399, month: 1, day: 1 });
  });

  test('accepts timestamp and ISO string', () => {
    const date = new Date('2024-01-01');
    expect(toJalali(date.getTime())).toEqual(toJalali(date));
    expect(toJalali(date.toISOString())).toEqual(toJalali(date));
  });

  test('throws on invalid date', () => {
    expect(() => toJalali('invalid')).toThrow('Invalid date');
    expect(() => toJalali(new Date('invalid'))).toThrow('Invalid date');
  });
});

describe('formatJalali', () => {
  const testDate = new Date('2024-03-21'); // 1403/01/01
  
  test('formats in Persian locale by default', () => {
    expect(formatJalali(testDate)).toBe('۰۱ فروردین ۱۴۰۳');
    expect(formatJalali(testDate, { locale: 'fa' })).toBe('۰۱ فروردین ۱۴۰۳');
  });

  test('formats in English locale', () => {
    expect(formatJalali(testDate, { locale: 'en' })).toBe('01 Farvardin 1403');
  });

  test('formats numeric', () => {
    expect(formatJalali(testDate, { format: 'numeric' })).toBe('۱۴۰۳/۰۱/۰۱');
    expect(formatJalali(testDate, { format: 'numeric', locale: 'en' })).toBe('1403/01/01');
    expect(formatJalali(testDate, { format: 'numeric', separator: '-' })).toBe('۱۴۰۳-۰۱-۰۱');
  });

  test('formats short', () => {
    expect(formatJalali(testDate, { format: 'short' })).toBe('۰۱ فرو ۱۴۰۳');
    expect(formatJalali(testDate, { format: 'short', locale: 'en' })).toBe('01 Far 1403');
  });

  test('includes weekday when requested', () => {
    const withWeekday = formatJalali(testDate, { showWeekday: true });
    expect(withWeekday).toMatch(/^(یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنج‌شنبه|جمعه|شنبه)، ۰۱ فروردین ۱۴۰۳$/);
  });

  test('supports custom pattern', () => {
    expect(formatJalali(testDate, { customPattern: 'YYYY-MM-DD' })).toBe('1403-01-01');
    expect(formatJalali(testDate, { customPattern: 'DD/MM/YYYY', locale: 'fa' })).toBe('۰۱/۰۱/۱۴۰۳');
    expect(formatJalali(testDate, { customPattern: 'Month: MMMM, Year: YY' })).toBe('Month: فروردین, Year: 03');
  });

  test('accepts JalaliDate object directly', () => {
    expect(formatJalali({ year: 1403, month: 1, day: 1 })).toBe('۰۱ فروردین ۱۴۰۳');
  });
});