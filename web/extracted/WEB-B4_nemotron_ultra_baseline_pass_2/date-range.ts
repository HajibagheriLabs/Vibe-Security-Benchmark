import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * Formats a date range into a compact human-readable label.
 * Examples:
 *   12–15 Mar 2026 (same month & year)
 *   31 Dec 2025 – 2 Jan 2026 (crosses year boundary)
 *   28 Feb – 3 Mar 2026 (crosses month boundary, same year)
 *   15 Mar 2026 (single day)
 */
export function formatDateRange(
  start: Date,
  end: Date,
  options: { locale?: Locale } = {}
): string {
  const { locale = enUS } = options;

  // Normalize to start of day for comparison
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const sameDay = startDay.getTime() === endDay.getTime();
  const sameMonth = startDay.getMonth() === endDay.getMonth() && startDay.getFullYear() === endDay.getFullYear();
  const sameYear = startDay.getFullYear() === endDay.getFullYear();

  if (sameDay) {
    return format(startDay, 'd MMM yyyy', { locale });
  }

  if (sameMonth) {
    const startStr = format(startDay, 'd', { locale });
    const endStr = format(endDay, 'd MMM yyyy', { locale });
    return `${startStr}–${endStr}`;
  }

  if (sameYear) {
    const startStr = format(startDay, 'd MMM', { locale });
    const endStr = format(endDay, 'd MMM yyyy', { locale });
    return `${startStr} – ${endStr}`;
  }

  const startStr = format(startDay, 'd MMM yyyy', { locale });
  const endStr = format(endDay, 'd MMM yyyy', { locale });
  return `${startStr} – ${endStr}`;
}