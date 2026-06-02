'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

// Mint a one-time "upload pass" (a signed upload URL token) for one audio file.
//
// The browser can't reliably prove it's an admin to Storage's RLS, so instead
// the SERVER — which already knows you're an admin (requireAdmin) — uses the
// service-role client to authorize this single file. The browser then uploads
// straight to Storage using the returned token. No Storage RLS involved.
export async function createAudioUploadUrl(
  path: string,
): Promise<{ token: string } | { error: string }> {
  await requireAdmin()

  // Only allow our expected filename shape, e.g. "day-100.mp3" / "day-100.m4a".
  // This stops a tampered request from writing to some other path.
  if (!/^day-\d{1,3}\.(mp3|m4a)$/.test(path)) {
    return { error: 'Invalid file path.' }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from('audio')
    .createSignedUploadUrl(path, { upsert: true })

  if (error || !data) {
    return { error: error?.message ?? 'Could not prepare the upload.' }
  }

  return { token: data.token }
}

type NewEpisode = {
  dayNumber: number
  title: string
  description: string
  keyQuote: string
  audioUrl: string
}

// Saves a new episode row. The big audio file was ALREADY uploaded to Storage
// by the browser; this just records the small text fields plus the file's URL.
//
// Security: requireAdmin() runs first, on the server, so even if someone calls
// this action directly (bypassing the form) a non-admin is bounced. The insert
// then uses the service-role client, which is allowed to write episodes.
//
// Returns { error } on failure. On success it doesn't return — it redirects.
export async function createEpisode(
  input: NewEpisode,
): Promise<{ error: string } | void> {
  await requireAdmin()

  // Re-validate on the server. Never trust that the browser checked — that's
  // defence in depth again.
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
    // 23505 = unique-violation: an episode for this day already exists.
    if (error.code === '23505') {
      return {
        error: `An episode for Day ${dayNumber} already exists. Edit it instead.`,
      }
    }
    return { error: error.message }
  }

  // Make the episodes list, the dashboard count, and the cached "today's
  // episode" all refresh.
  revalidatePath('/admin/episodes')
  revalidatePath('/admin')
  revalidatePath('/')

  // redirect() must be OUTSIDE any try/catch — it works by throwing a signal.
  redirect('/admin/episodes')
}

// Update an existing episode's text fields (and optionally a replaced audio
// file). The day number identifies the episode and isn't changed here.
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

// Pull the Storage path (e.g. "day-100.mp3") out of a public audio URL so we
// can delete the file. Returns null if the URL isn't a Storage URL.
function audioPathFromUrl(url: string): string | null {
  const marker = '/audio/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

// Delete an episode: removes the database row AND its audio file from Storage.
export async function deleteEpisode(
  dayNumber: number,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const supabase = createAdminClient()

  // Look up the audio URL first, so we know which file to delete.
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

  // Best-effort: remove the audio file too. If this fails we don't undo the
  // row delete — an orphaned file is harmless and can be cleaned up later.
  if (episode?.audio_url) {
    const path = audioPathFromUrl(episode.audio_url)
    if (path) await supabase.storage.from('audio').remove([path])
  }

  revalidatePath('/admin/episodes')
  revalidatePath('/admin')
  revalidatePath('/')
}
