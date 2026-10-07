/**
 * Formats a duration in seconds into mm:ss string.
 * 
 * Security Note: Pure functional utility. No side effects, no storage, no network.
 * Input validation: ensures seconds is a finite number >= 0 to prevent NaN/Infinity rendering.
 */

export function formatDuration(seconds: number): string {
  // Validate input
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    throw new Error('Duration must be a non-negative finite number');
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  // Pad with leading zeros
  const mm = String(minutes).padStart(2, '0');
  const ss = String(remainingSeconds).padStart(2, '0');

  return `${mm}:${ss}`;
}