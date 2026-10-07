// durationFormatter.js
/**
 * Formats a duration in seconds as `mm:ss`.
 * 
 * Security note: This utility is pure and stateless. It performs no storage,
 * network, or deep-link operations, so no security rules apply beyond
 * standard input validation.
 * 
 * @param {number} seconds - Duration in seconds (non-negative finite number)
 * @returns {string} Formatted duration as `mm:ss`
 * @throws {TypeError} If seconds is not a finite non-negative number
 */
export function formatDuration(seconds) {
  // Validate input: must be a finite, non-negative number
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError('Duration must be a non-negative finite number');
  }

  // Round to nearest whole second to handle fractional input
  const totalSeconds = Math.floor(seconds);
  
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  
  // Pad with leading zeros to ensure two-digit format
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(remainingSeconds).padStart(2, '0');
  
  return `${minutesStr}:${secondsStr}`;
}