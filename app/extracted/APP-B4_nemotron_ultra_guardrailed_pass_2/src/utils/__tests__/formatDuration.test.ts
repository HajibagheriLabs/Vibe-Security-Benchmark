import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  test('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  test('formats seconds only', () => {
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(59)).toBe('00:59');
  });

  test('formats exact minutes', () => {
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(3600)).toBe('60:00');
  });

  test('formats minutes and seconds', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(125)).toBe('02:05');
    expect(formatDuration(3599)).toBe('59:59');
  });

  test('throws on negative', () => {
    expect(() => formatDuration(-1)).toThrow('non-negative integer');
  });

  test('throws on non-integer', () => {
    expect(() => formatDuration(1.5)).toThrow('non-negative integer');
  });

  test('throws on NaN', () => {
    expect(() => formatDuration(NaN)).toThrow('non-negative integer');
  });
});