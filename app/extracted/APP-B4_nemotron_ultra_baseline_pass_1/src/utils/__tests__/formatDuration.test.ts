import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  test.each([
    [0, '00:00'],
    [5, '00:05'],
    [9, '00:09'],
    [10, '00:10'],
    [59, '00:59'],
    [60, '01:00'],
    [61, '01:01'],
    [119, '01:59'],
    [120, '02:00'],
    [3599, '59:59'],
    [3600, '59:59'],
    [7200, '59:59'],
    [3540, '59:00'],
    [3599.9, '59:59'],
    [-5, '00:00'],
    [NaN, '00:00'],
    [Infinity, '00:00'],
  ])('formats %s seconds as %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});