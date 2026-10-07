/**
 * Formats a date range into a compact human-readable label.
 * 
 * @param startDate - The start date.
 * @param endDate - The end date.
 * @returns A formatted string like "12–15 Mar 2026".
 * @throws Error if startDate is after endDate.
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  if (startDate > endDate) {
    throw new Error("Start date must be before or equal to end date.");
  }

  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const startMonthStr = monthNames[startMonth];
  const endMonthStr = monthNames[endMonth];

  // Determine if we need to include the year
  // Include year if years are different, or if it's the current year and months/days differ significantly enough to warrant clarity,
  // but typically for compact labels, we just include the year if it's not the current year, or if the range spans years.
  // However, the example "12–15 Mar 2026" includes the year. Let's follow a standard convention:
  // If startYear == endYear, we usually just show the year once at the end.
  // If startYear != endYear, we might need to show both or just the start year? 
  // Standard compact: "12–15 Mar 2026" implies same year.
  // If different years: "12 Mar – 5 Apr 2026" or "12 Mar 2025 – 5 Apr 2026".
  
  // Let's stick to the simplest interpretation of "compact":
  // If same year: "startDay–endDay Month Year" (if months are same) or "startDay Month – endDay Month Year" (if months differ)
  // If different years: "startDay Month Year – endDay Month Year"

  const isCurrentYear = (startYear === new Date().getFullYear());
  const showYear = !isCurrentYear || startYear !== endYear;

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      // Same month, same year: "12–15 Mar 2026"
      const yearStr = showYear ? ` ${startYear}` : "";
      return `${startDay}–${endDay} ${startMonthStr}${yearStr}`;
    } else {
      // Different months, same year: "12 Mar – 15 Apr 2026"
      const yearStr = showYear ? ` ${startYear}` : "";
      return `${startDay} ${startMonthStr} – ${endDay} ${endMonthStr}${yearStr}`;
    }
  } else {
    // Different years: "12 Mar 2025 – 5 Apr 2026"
    return `${startDay} ${startMonthStr} ${startYear} – ${endDay} ${endMonthStr} ${endYear}`;
  }
}