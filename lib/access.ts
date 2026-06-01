// The single source of truth for "is this user allowed to PLAY this episode?"
// Keeping this rule in one file means the UI and the server check the exact
// same thing — they can never drift apart and disagree.

type AccessProfile = { subscription_status: string | null } | null
type AccessEpisode = { day_number: number }

// currentDay is passed in (not computed here) because it depends on the user's
// time zone, which only the page knows — see calculateDayNumber in lib/dayNumber.
export function canPlayEpisode(
  profile: AccessProfile,
  episode: AccessEpisode,
  currentDay: number,
): boolean {
  // Day 1 is the free trial — anyone can play it, paid or not.
  if (episode.day_number === 1) return true

  // Everything else needs an active subscription AND the day must be unlocked.
  return (
    profile?.subscription_status === 'active' && episode.day_number <= currentDay
  )
}
