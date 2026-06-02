import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import EditEpisodeForm from './edit-form'

export const dynamic = 'force-dynamic'

export default async function EditEpisodePage({
  params,
}: {
  params: Promise<{ day: string }>
}) {
  const { day } = await params
  const dayNumber = Number.parseInt(day, 10)
  if (Number.isNaN(dayNumber)) notFound()

  const supabase = createAdminClient()
  const { data: episode } = await supabase
    .from('episodes')
    .select('day_number, title, description, key_quote, audio_url')
    .eq('day_number', dayNumber)
    .single()

  if (!episode) notFound()

  return (
    <EditEpisodeForm
      dayNumber={episode.day_number}
      initialTitle={episode.title ?? ''}
      initialDescription={episode.description ?? ''}
      initialKeyQuote={episode.key_quote ?? ''}
      initialAudioUrl={episode.audio_url ?? ''}
    />
  )
}
