import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  test('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  test('formats seconds under a minute', () => {
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(59)).toBe('00:59');
  });

  test('formats exact minutes', () => {
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(120)).toBe('02:00');
  });

  test('formats minutes and seconds', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3599)).toBe('59:59');
  });

  test('caps at 59:59 for durations >= 3600 seconds', () => {
    expect(formatDuration(3600)).toBe('59:59');
    expect(formatDuration(7200)).toBe('59:59');
    expect(formatDuration(100000)).toBe('59:59');
  });

  test('handles non-integer input by flooring', () => {
    expect(formatDuration(61.9)).toBe('01:01');
    expect(formatDuration(119.1)).toBe('01:59');
  });

  test('handles invalid input gracefully', () => {
    expect(formatDuration(-1)).toBe('00:00');
    expect(formatDuration(-60)).toBe('00:00');
    expect(formatDuration(NaN)).toBe('00:00');
    expect(formatDuration(Infinity)).toBe('00:00');
    expect(formatDuration(-Infinity)).toBe('00:00');
  });
});