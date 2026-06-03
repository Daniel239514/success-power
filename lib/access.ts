// The single source of truth for "is this user allowed to PLAY this episode?"
// Keeping this rule in one file means the UI and the server check the exact
// same thing — they can never drift apart and disagree.

type AccessProfile = {
  subscription_status: string | null
  // Only needed for the 'cancelling' case; optional so older callers that
  // don't select it still type-check (they just never hit that branch).
  current_period_end?: string | null
} | null
type AccessEpisode = { day_number: number }

// Does this user currently have paid access?
//   'active'     -> renewing normally, full access.
//   'cancelling' -> they cancelled (Paystack) but their paid period hasn't
//                   ended yet, so access continues until current_period_end.
//                   Paystack sends no webhook at the actual end date, so this
//                   date comparison is what eventually locks them out.
//   anything else (free, null) -> no access.
export function hasSubscriberAccess(profile: AccessProfile): boolean {
  if (!profile) return false
  if (profile.subscription_status === 'active') return true
  if (profile.subscription_status === 'cancelling') {
    const end = profile.current_period_end
    return Boolean(end) && new Date(end as string).getTime() > Date.now()
  }
  return false
}

// currentDay is passed in (not computed here) because it depends on the user's
// time zone, which only the page knows — see calculateDayNumber in lib/dayNumber.
export function canPlayEpisode(
  profile: AccessProfile,
  episode: AccessEpisode,
  currentDay: number,
): boolean {
  // Day 1 is the free trial — anyone can play it, paid or not.
  if (episode.day_number === 1) return true

  // Everything else needs paid access AND the day must be unlocked.
  return hasSubscriberAccess(profile) && episode.day_number <= currentDay
}
