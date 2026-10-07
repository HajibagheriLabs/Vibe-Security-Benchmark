import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  test.each([
    [0, '00:00'],
    [5, '00:05'],
    [59, '00:59'],
    [60, '01:00'],
    [65, '01:05'],
    [3599, '59:59'],
    [3600, '60:00'],
    [3661, '61:01'],
  ])('formats %d seconds as %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  test('floors fractional seconds', () => {
    expect(formatDuration(59.9)).toBe('00:59');
  });

  test.each([-1, -0.1, NaN, Infinity, -Infinity])(
    'throws on invalid input %p',
    (input) => {
      expect(() => formatDuration(input)).toThrow();
    }
  );
});