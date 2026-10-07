/**
 * Formats a duration in seconds as `mm:ss`.
 *
 * @param {number} totalSeconds - The duration in seconds. Must be a non-negative number.
 * @returns {string} The formatted duration in `mm:ss` format.
 * @throws {TypeError} If totalSeconds is not a number.
 * @throws {RangeError} If totalSeconds is negative.
 */
export function formatDuration(totalSeconds) {
  if (typeof totalSeconds !== 'number' || Number.isNaN(totalSeconds)) {
    throw new TypeError('totalSeconds must be a number');
  }

  if (totalSeconds < 0) {
    throw new RangeError('totalSeconds must be non-negative');
  }

  const totalWholeSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(totalWholeSeconds / 60);
  const seconds = totalWholeSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
}

export default formatDuration;