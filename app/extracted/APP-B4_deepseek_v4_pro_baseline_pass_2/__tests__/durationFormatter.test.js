import { formatDuration } from '../durationFormatter';

describe('formatDuration', () => {
  test('formats 0 seconds as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  test('formats seconds less than 10 with leading zero', () => {
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(9)).toBe('00:09');
  });

  test('formats seconds between 10 and 59 without leading zero on seconds', () => {
    expect(formatDuration(10)).toBe('00:10');
    expect(formatDuration(45)).toBe('00:45');
    expect(formatDuration(59)).toBe('00:59');
  });

  test('formats exactly one minute as 01:00', () => {
    expect(formatDuration(60)).toBe('01:00');
  });

  test('formats minutes less than 10 with leading zero', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(599)).toBe('09:59');
  });

  test('formats minutes 10 or greater without leading zero on minutes', () => {
    expect(formatDuration(600)).toBe('10:00');
    expect(formatDuration(754)).toBe('12:34');
  });

  test('formats large durations correctly', () => {
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(3661)).toBe('61:01');
    expect(formatDuration(7325)).toBe('122:05');
  });

  test('floors fractional seconds', () => {
    expect(formatDuration(65.7)).toBe('01:05');
    expect(formatDuration(0.9)).toBe('00:00');
    expect(formatDuration(59.99)).toBe('00:59');
  });

  test('throws TypeError for non-number input', () => {
    expect(() => formatDuration('60')).toThrow(TypeError);
    expect(() => formatDuration(null)).toThrow(TypeError);
    expect(() => formatDuration(undefined)).toThrow(TypeError);
    expect(() => formatDuration(NaN)).toThrow(TypeError);
  });

  test('throws RangeError for negative input', () => {
    expect(() => formatDuration(-1)).toThrow(RangeError);
    expect(() => formatDuration(-60)).toThrow(RangeError);
  });
});