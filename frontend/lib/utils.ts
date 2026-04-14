/**
 * Returns a date string in YYYY-MM-DD format for the user's local timezone.
 * This prevents the "lag" associated with .toISOString() which returns UTC.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
