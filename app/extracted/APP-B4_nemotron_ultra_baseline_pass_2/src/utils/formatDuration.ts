/**
 * Formats a duration in seconds as mm:ss.
 * @param seconds - Total seconds (non-negative integer). Values >= 3600 are capped at 59:59.
 * @returns Formatted string "mm:ss" with zero-padded minutes and seconds.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const total = Math.floor(seconds);
  const capped = Math.min(total, 59 * 60 + 59);
  const minutes = Math.floor(capped / 60);
  const secs = capped % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}`;
}