/**
 * Formats a non-negative duration in seconds as mm:ss.
 * Throws on negative or non-finite input.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error('Duration must be a non-negative finite number');
  }
  const total = Math.floor(seconds);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}