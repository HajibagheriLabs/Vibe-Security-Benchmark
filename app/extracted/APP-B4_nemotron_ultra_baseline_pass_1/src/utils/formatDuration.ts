/**
 * Formats a non-negative duration in seconds as mm:ss.
 * Values >= 3600 seconds (1 hour) are capped at 59:59.
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const capped = Math.min(Math.floor(totalSeconds), 3599);
  const minutes = Math.floor(capped / 60);
  const seconds = capped % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}