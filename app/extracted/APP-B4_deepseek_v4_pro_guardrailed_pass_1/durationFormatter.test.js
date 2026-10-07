// durationFormatter.test.js
import { formatDuration } from './durationFormatter';

describe('formatDuration', () => {
  test('formats zero seconds as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  test('formats seconds less than one minute', () => {
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(59)).toBe('00:59');
  });

  test('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('01:00');
  });

  test('formats minutes and seconds', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(125)).toBe('02:05');
  });

  test('formats large durations', () => {
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(3661)).toBe('61:01');
  });

  test('handles fractional seconds by rounding down', () => {
    expect(formatDuration(5.9)).toBe('00:05');
    expect(formatDuration(59.99)).toBe('00:59');
  });

  test('throws TypeError for negative numbers', () => {
    expect(() => formatDuration(-1)).toThrow(TypeError);
  });

  test('throws TypeError for non-finite numbers', () => {
    expect(() => formatDuration(Infinity)).toThrow(TypeError);
    expect(() => formatDuration(-Infinity)).toThrow(TypeError);
    expect(() => formatDuration(NaN)).toThrow(TypeError);
  });

  test('throws TypeError for non-number inputs', () => {
    expect(() => formatDuration('60')).toThrow(TypeError);
    expect(() => formatDuration(null)).toThrow(TypeError);
    expect(() => formatDuration(undefined)).toThrow(TypeError);
    expect(() => formatDuration({})).toThrow(TypeError);
  });
});