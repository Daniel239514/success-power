'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteAudioFromR2 } from '@/lib/r2'

type NewEpisode = {
  dayNumber: number
  title: string
  description: string
  keyQuote: string
  audioUrl: string
}

// Saves a new episode row. The audio file was already uploaded to R2 by the
// browser via /api/admin/upload-audio; this just records the text fields plus
// the R2 storage key (e.g. "episodes/uuid.mp3").
export async function createEpisode(
  input: NewEpisode,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const dayNumber = Math.trunc(Number(input.dayNumber))
  if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 365) {
    return { error: 'Day number must be between 1 and 365.' }
  }
  if (!input.title.trim()) return { error: 'Title is required.' }
  if (input.description.length > 200) {
    return { error: 'Description must be 200 characters or fewer.' }
  }
  if (!input.audioUrl) return { error: 'Audio file is missing.' }

  const supabase = createAdminClient()

  const { error } = await supabase.from('episodes').insert({
    day_number: dayNumber,
    title: input.title.trim(),
    description: input.description.trim(),
    key_quote: input.keyQuote.trim(),
    audio_url: input.audioUrl,
  })

  if (error) {
    if (error.code === '23505') {
      return {
        error: `An episode for Day ${dayNumber} already exists. Edit it instead.`,
      }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/episodes')
  revalidatePath('/admin')
  revalidatePath('/')

  redirect('/admin/episodes')
}

export async function updateEpisode(
  input: Omit<NewEpisode, never>,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const dayNumber = Math.trunc(Number(input.dayNumber))
  if (!Number.isFinite(dayNumber)) return { error: 'Bad day number.' }
  if (!input.title.trim()) return { error: 'Title is required.' }
  if (input.description.length > 200) {
    return { error: 'Description must be 200 characters or fewer.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('episodes')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      key_quote: input.keyQuote.trim(),
      audio_url: input.audioUrl,
    })
    .eq('day_number', dayNumber)

  if (error) return { error: error.message }

  revalidatePath('/admin/episodes')
  revalidatePath('/')
  redirect('/admin/episodes')
}

// Delete an episode: removes the database row AND the audio file.
// Handles both new R2 keys (e.g. "episodes/uuid.mp3") and old Supabase URLs
// (https://...) that haven't been migrated yet.
export async function deleteEpisode(
  dayNumber: number,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const supabase = createAdminClient()

  const { data: episode } = await supabase
    .from('episodes')
    .select('audio_url')
    .eq('day_number', dayNumber)
    .single()

  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('day_number', dayNumber)

  if (error) return { error: error.message }

  if (episode?.audio_url) {
    const audioUrl = episode.audio_url
    if (audioUrl.startsWith('https://')) {
      // Old Supabase Storage URL — extract the path and delete from Storage.
      const marker = '/audio/'
      const i = audioUrl.indexOf(marker)
      if (i !== -1) {
        const path = decodeURIComponent(audioUrl.slice(i + marker.length).split('?')[0])
        await supabase.storage.from('audio').remove([path])
      }
    } else {
      // R2 key — delete directly.
      await deleteAudioFromR2(audioUrl)
    }
  }

  revalidatePath('/admin/episodes')
  revalidatePath('/admin')
  revalidatePath('/')
}
