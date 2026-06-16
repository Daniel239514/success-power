import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { calculateDayNumber } from '@/lib/dayNumber'
import { canPlayEpisode } from '@/lib/access'
import { getSignedAudioUrl } from '@/lib/r2'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/episodes/[id]/audio-url'>,
) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_start_date, current_period_end')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  const { data: episode } = await supabase
    .from('episodes')
    .select('day_number, audio_url')
    .eq('id', id)
    .single()

  if (!episode) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
  }

  const tz = (await cookies()).get('tz')?.value
  const currentDay = calculateDayNumber(profile.subscription_start_date, tz)

  if (!canPlayEpisode(profile, episode, currentDay)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const audioUrl = episode.audio_url

  // Old episodes still have a full Supabase public URL — return it directly
  // until the Step F migration converts them to R2 keys.
  if (audioUrl.startsWith('https://')) {
    return NextResponse.json({ url: audioUrl })
  }

  // New episodes store an R2 key — generate a 1-hour presigned URL.
  const signedUrl = await getSignedAudioUrl(audioUrl)
  return NextResponse.json({ url: signedUrl })
}
