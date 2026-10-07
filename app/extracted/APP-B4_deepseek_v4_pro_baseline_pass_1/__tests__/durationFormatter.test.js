import { formatDuration } from '../durationFormatter';

describe('formatDuration', () => {
  describe('basic formatting', () => {
    test('formats 0 seconds as 00:00', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    test('formats 1 second as 00:01', () => {
      expect(formatDuration(1)).toBe('00:01');
    });

    test('formats 9 seconds as 00:09', () => {
      expect(formatDuration(9)).toBe('00:09');
    });

    test('formats 10 seconds as 00:10', () => {
      expect(formatDuration(10)).toBe('00:10');
    });

    test('formats 59 seconds as 00:59', () => {
      expect(formatDuration(59)).toBe('00:59');
    });

    test('formats 60 seconds as 01:00', () => {
      expect(formatDuration(60)).toBe('01:00');
    });

    test('formats 61 seconds as 01:01', () => {
      expect(formatDuration(61)).toBe('01:01');
    });

    test('formats 599 seconds as 09:59', () => {
      expect(formatDuration(599)).toBe('09:59');
    });

    test('formats 600 seconds as 10:00', () => {
      expect(formatDuration(600)).toBe('10:00');
    });

    test('formats 3599 seconds as 59:59', () => {
      expect(formatDuration(3599)).toBe('59:59');
    });

    test('formats 3600 seconds as 60:00', () => {
      expect(formatDuration(3600)).toBe('60:00');
    });

    test('formats 3661 seconds as 61:01', () => {
      expect(formatDuration(3661)).toBe('61:01');
    });

    test('formats 7325 seconds as 122:05', () => {
      expect(formatDuration(7325)).toBe('122:05');
    });
  });

  describe('fractional seconds', () => {
    test('floors fractional seconds (0.9 -> 00:00)', () => {
      expect(formatDuration(0.9)).toBe('00:00');
    });

    test('floors fractional seconds (1.5 -> 00:01)', () => {
      expect(formatDuration(1.5)).toBe('00:01');
    });

    test('floors fractional seconds (59.99 -> 00:59)', () => {
      expect(formatDuration(59.99)).toBe('00:59');
    });

    test('floors fractional seconds (60.7 -> 01:00)', () => {
      expect(formatDuration(60.7)).toBe('01:00');
    });
  });

  describe('large values', () => {
    test('formats 100 minutes (6000 seconds) as 100:00', () => {
      expect(formatDuration(6000)).toBe('100:00');
    });

    test('formats 999 minutes (59940 seconds) as 999:00', () => {
      expect(formatDuration(59940)).toBe('999:00');
    });

    test('formats 1000 minutes (60000 seconds) as 1000:00', () => {
      expect(formatDuration(60000)).toBe('1000:00');
    });
  });

  describe('error handling', () => {
    test('throws TypeError when given a string', () => {
      expect(() => formatDuration('60')).toThrow(TypeError);
    });

    test('throws TypeError when given null', () => {
      expect(() => formatDuration(null)).toThrow(TypeError);
    });

    test('throws TypeError when given undefined', () => {
      expect(() => formatDuration(undefined)).toThrow(TypeError);
    });

    test('throws TypeError when given NaN', () => {
      expect(() => formatDuration(NaN)).toThrow(TypeError);
    });

    test('throws TypeError when given an object', () => {
      expect(() => formatDuration({})).toThrow(TypeError);
    });

    test('throws RangeError when given a negative number', () => {
      expect(() => formatDuration(-1)).toThrow(RangeError);
    });

    test('throws RangeError when given -0.5', () => {
      expect(() => formatDuration(-0.5)).toThrow(RangeError);
    });
  });

  describe('edge cases', () => {
    test('handles Infinity by throwing TypeError (not a finite number)', () => {
      expect(() => formatDuration(Infinity)).toThrow(TypeError);
    });

    test('handles -Infinity by throwing TypeError', () => {
      expect(() => formatDuration(-Infinity)).toThrow(TypeError);
    });
  });
});