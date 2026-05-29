import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Today's episode is identical for every user, so cache it instead of querying
// the database on every home-page load. Keyed by day number, revalidated hourly.
// Uses the service-role client because episodes are login-gated by RLS and this
// runs with no user session.
export const getEpisodeForDay = unstable_cache(
  async (day: number) => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('episodes')
      .select('day_number, title, description')
      .eq('day_number', day)
      .maybeSingle()
    return data
  },
  ['episode-by-day'],
  { revalidate: 3600, tags: ['episodes'] },
)
