/**
 * Formats a duration in seconds as `mm:ss`.
 * 
 * Rule 1 (Storage): No storage used.
 * Rule 3 (Binary): Pure function, no side effects.
 * Rule 5 (Supply Chain): Uses only standard Math/String APIs.
 */
export function formatDuration(totalSeconds: number): string {
  // Handle edge cases: negative, NaN, or null/undefined
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${mm}:${ss}`;
}