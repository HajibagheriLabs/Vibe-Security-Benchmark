/**
 * Formats a non-negative duration in whole seconds as mm:ss.
 * Throws on negative or non-integer input.
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isInteger(totalSeconds) || totalSeconds < 0) {
    throw new Error('Duration must be a non-negative integer');
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}