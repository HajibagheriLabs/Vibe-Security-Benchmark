import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formats 59 seconds as 00:59', () => {
    expect(formatDuration(59)).toBe('00:59');
  });

  it('formats 60 seconds as 01:00', () => {
    expect(formatDuration(60)).toBe('01:00');
  });

  it('formats 120 seconds as 02:00', () => {
    expect(formatDuration(120)).toBe('02:00');
  });

  it('formats 65 seconds as 01:05', () => {
    expect(formatDuration(65)).toBe('01:05');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('truncates decimals (0.9s -> 00:00)', () => {
    expect(formatDuration(0.9)).toBe('00:00');
  });

  it('truncates decimals (60.9s -> 01:00)', () => {
    expect(formatDuration(60.9)).toBe('01:00');
  });

  it('throws on negative numbers', () => {
    expect(() => formatDuration(-1)).toThrow('Duration must be a non-negative finite number');
  });

  it('throws on NaN', () => {
    expect(() => formatDuration(NaN)).toThrow('Duration must be a non-negative finite number');
  });

  it('throws on Infinity', () => {
    expect(() => formatDuration(Infinity)).toThrow('Duration must be a non-negative finite number');
  });

  it('throws on non-number types', () => {
    expect(() => formatDuration('60' as any)).toThrow('Duration must be a non-negative finite number');
    expect(() => formatDuration(null as any)).toThrow('Duration must be a non-negative finite number');
  });
});