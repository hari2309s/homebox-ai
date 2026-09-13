/**
 * Formats a plain `YYYY-MM-DD` date (no time component, as stored by
 * Postgres `date` columns and returned by the AI's date suggestions) using
 * the viewer's locale. Parses the components directly instead of via
 * `new Date(dateString)`, which treats a date-only ISO string as UTC
 * midnight and can display as the previous day west of UTC.
 */
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
