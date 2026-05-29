// "Today" as a YYYY-MM-DD calendar date in the given IANA time zone (e.g.
// "America/New_York"). Falls back to UTC if the zone is missing or invalid
// (the zone comes from a client cookie, so it can't be fully trusted).
function todayInZone(timeZone: string | undefined): string {
  const format = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

  try {
    return format(timeZone || 'UTC')
  } catch {
    return format('UTC')
  }
}

export function calculateDayNumber(
  subscriptionStartDate: string,
  timeZone?: string,
): number {
  const [startYear, startMonth, startDay] = subscriptionStartDate
    .split('-')
    .map(Number)
  const startUTC = Date.UTC(startYear, startMonth - 1, startDay)

  const [todayYear, todayMonth, todayDay] = todayInZone(timeZone)
    .split('-')
    .map(Number)
  const todayUTC = Date.UTC(todayYear, todayMonth - 1, todayDay)

  const msPerDay = 1000 * 60 * 60 * 24
  const daysDiff = Math.floor((todayUTC - startUTC) / msPerDay)

  return daysDiff + 1
}

export const TOTAL_DAYS = 365
