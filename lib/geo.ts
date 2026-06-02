import { headers } from 'next/headers'

// What country is this visitor in? Returns an ISO code like "NG" or "US",
// or null if we can't tell. Callers MUST treat null as "default to Stripe" —
// a geolocation failure should never block a sale.
//
// Testing locally: your own machine has no public IP (it shows as ::1 or
// 127.0.0.1), so a real lookup can't work in dev. Pass `override` (we'll wire
// it to a ?country=NG query param on /subscribe) or set GEO_COUNTRY_OVERRIDE
// in .env.local to spoof a country while testing.
export async function getCountry(override?: string | null): Promise<string | null> {
  // 1. An explicit override always wins — this is your local test hook.
  const forced = override ?? process.env.GEO_COUNTRY_OVERRIDE
  if (forced) return forced.toUpperCase()

  // 2. Find the real visitor IP from the proxy header (see getClientIp below).
  const ip = await getClientIp()
  if (!ip || isLocalIp(ip)) return null

  // 3. Ask ipapi.co. Free tier ~1,000 lookups/day, no API key needed.
  //    We abort after 2s so a slow or down service never stalls the page,
  //    and we cache by IP for a day to stay well under the daily limit.
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    // On success ipapi returns just the 2-letter code as plain text.
    // On failure it returns an error blob, so we validate the shape.
    const country = (await res.text()).trim()
    return /^[A-Z]{2}$/.test(country) ? country : null
  } catch {
    return null // network error, timeout, or abort
  }
}

// Pull the original visitor IP out of the request headers.
// We use x-forwarded-for (not request.ip) because the app runs behind Vercel's
// proxy: the real client IP is forwarded in this header, while request.ip is
// unreliable/absent in this Next version. The header is a comma-separated list
// "client, proxy1, proxy2" — the FIRST entry is the original visitor.
async function getClientIp(): Promise<string | null> {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip') // Vercel sets this too; use as a fallback
}

// Localhost / private-network IPs can't be geolocated, so we bail to null
// (and the caller defaults to Stripe) rather than waste a lookup.
function isLocalIp(ip: string): boolean {
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  )
}
