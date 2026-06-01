// What hour (0-23) is it RIGHT NOW in the given IANA time zone?
// e.g. currentHourInZone("America/New_York") -> 6  means it's 6-something AM there.
// Returns null if the zone is missing/invalid, so callers can skip that user.
export function currentHourInZone(timeZone: string | null | undefined): number | null {
  if (!timeZone) return null
  try {
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hour12: false,
      hourCycle: 'h23', // ensures midnight is "00", not "24"
    }).format(new Date())
    return parseInt(hourStr, 10)
  } catch {
    return null // invalid zone string
  }
}

// The calendar date (YYYY-MM-DD) of a given instant, as seen in a time zone.
// e.g. a UTC timestamp of 2026-06-01T23:30Z is "2026-06-02" in Africa/Lagos.
// Used to ask "did this happen today in the user's zone?". Falls back to UTC.
export function dateInZone(date: Date, timeZone: string | null | undefined): string {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  try {
    return fmt(timeZone || 'UTC')
  } catch {
    return fmt('UTC')
  }
}

// Validate that a string is a real IANA time zone (used before saving to the DB).
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone })
    return true
  } catch {
    return false
  }
}
