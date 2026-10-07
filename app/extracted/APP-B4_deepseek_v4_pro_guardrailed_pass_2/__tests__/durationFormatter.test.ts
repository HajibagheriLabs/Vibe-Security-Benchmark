// __tests__/durationFormatter.test.ts

import { formatDuration } from '../durationFormatter';

describe('formatDuration', () => {
  describe('valid input', () => {
    it('formats zero seconds', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('formats seconds less than one minute', () => {
      expect(formatDuration(5)).toBe('00:05');
      expect(formatDuration(59)).toBe('00:59');
    });

    it('formats exactly one minute', () => {
      expect(formatDuration(60)).toBe('01:00');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(125)).toBe('02:05');
    });

    it('formats large durations', () => {
      expect(formatDuration(3600)).toBe('60:00');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('formats single-digit minutes with leading zero', () => {
      expect(formatDuration(600)).toBe('10:00');
    });

    it('accepts numeric strings', () => {
      expect(formatDuration('90')).toBe('01:30');
    });

    it('rounds fractional seconds', () => {
      expect(formatDuration(59.6)).toBe('01:00');
      expect(formatDuration(59.4)).toBe('00:59');
    });
  });

  describe('invalid input', () => {
    it('returns fallback for negative values', () => {
      expect(formatDuration(-1)).toBe('00:00');
      expect(formatDuration(-60)).toBe('00:00');
    });

    it('returns fallback for NaN', () => {
      expect(formatDuration(NaN)).toBe('00:00');
    });

    it('returns fallback for Infinity', () => {
      expect(formatDuration(Infinity)).toBe('00:00');
      expect(formatDuration(-Infinity)).toBe('00:00');
    });

    it('returns fallback for non-numeric strings', () => {
      expect(formatDuration('abc')).toBe('00:00');
      expect(formatDuration('')).toBe('00:00');
    });

    it('returns fallback for null and undefined', () => {
      expect(formatDuration(null as unknown as number)).toBe('00:00');
      expect(formatDuration(undefined as unknown as number)).toBe('00:00');
    });
  });

  describe('edge cases', () => {
    it('handles very large numbers without overflow', () => {
      expect(formatDuration(Number.MAX_SAFE_INTEGER)).toMatch(/^\d{2,}:\d{2}$/);
    });

    it('handles scientific notation strings', () => {
      expect(formatDuration('1e2')).toBe('01:40');
    });
  });
});