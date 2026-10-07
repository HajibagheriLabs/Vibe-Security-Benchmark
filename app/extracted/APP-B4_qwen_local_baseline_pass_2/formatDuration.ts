// formatDuration.ts

/**
 * Formats a duration in seconds as `mm:ss`.
 * @param seconds - The duration in seconds. Must be a non-negative integer.
 * @returns A string formatted as `mm:ss`.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    throw new Error("Duration must be non-negative.");
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
}