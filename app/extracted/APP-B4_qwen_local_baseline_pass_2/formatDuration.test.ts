// formatDuration.test.ts

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

  it('formats 3661 seconds as 01:01:01', () => {
    // Wait, the requirement is mm:ss. Let's check 3661.
    // 3661 / 60 = 61 minutes, 1 second.
    // So it should be 61:01.
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('formats 3600 seconds as 60:00', () => {
    expect(formatDuration(3600)).toBe('60:00');
  });

  it('formats 1 second as 00:01', () => {
    expect(formatDuration(1)).toBe('00:01');
  });

  it('formats 100 seconds as 01:40', () => {
    expect(formatDuration(100)).toBe('01:40');
  });

  it('throws error for negative seconds', () => {
    expect(() => formatDuration(-1)).toThrow("Duration must be non-negative.");
  });

  it('truncates fractional seconds', () => {
    expect(formatDuration(59.9)).toBe('00:59');
    expect(formatDuration(60.9)).toBe('01:00');
  });
});