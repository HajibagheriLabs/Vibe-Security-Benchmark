// durationFormatter.ts

/**
 * Formats a duration in seconds as `mm:ss`.
 *
 * Security note: This utility performs no I/O and handles no sensitive data.
 * Input is validated and coerced defensively; invalid input returns a safe
 * fallback string rather than throwing or producing NaN output.
 *
 * @param seconds - Duration in seconds (number or numeric string)
 * @returns Formatted string in `mm:ss` format, or "00:00" for invalid input
 */
export function formatDuration(seconds: number | string): string {
  // Parse and validate input defensively
  const numericSeconds = typeof seconds === 'string' ? Number(seconds) : seconds;

  if (!Number.isFinite(numericSeconds) || numericSeconds < 0) {
    return '00:00';
  }

  // Round to nearest whole second to avoid floating-point display artifacts
  const totalSeconds = Math.round(numericSeconds);

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(remainingSeconds).padStart(2, '0');

  return `${minutesStr}:${secondsStr}`;
}