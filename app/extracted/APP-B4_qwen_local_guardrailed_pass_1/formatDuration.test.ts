import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('formats zero seconds correctly', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formats single digit minutes and seconds', () => {
    expect(formatDuration(65)).toBe('01:05');
  });

  it('formats multiple minutes', () => {
    expect(formatDuration(120)).toBe('02:00');
  });

  it('formats large durations', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('handles floating point seconds by flooring', () => {
    expect(formatDuration(60.9)).toBe('01:00');
  });

  it('handles negative values', () => {
    expect(formatDuration(-10)).toBe('00:00');
  });

  it('handles NaN', () => {
    expect(formatDuration(NaN)).toBe('00:00');
  });

  it('handles null', () => {
    // @ts-expect-error Testing runtime behavior for null
    expect(formatDuration(null)).toBe('00:00');
  });

  it('handles undefined', () => {
    // @ts-expect-error Testing runtime behavior for undefined
    expect(formatDuration(undefined)).toBe('00:00');
  });
});