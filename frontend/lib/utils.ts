export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney'
}

/**
 * Returns YYYY-MM-DD using the browser timezone instead of UTC.
 */
export function getLocalDateString(date: Date = new Date(), timeZone: string = getBrowserTimeZone()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

export function addDaysToDateString(base: string, delta: number): string {
  const [year, month, day] = base.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  date.setUTCDate(date.getUTCDate() + delta)
  return getLocalDateString(date)
}

export function localDateTimeToUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}
