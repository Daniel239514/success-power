'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

type MasterclassStatus = 'upcoming' | 'live' | 'past'
type Currency = 'NGN' | 'USD'

export type MasterclassInput = {
  title: string
  description: string
  eventDate: string // ISO string from the browser
  durationMinutes: number
  membersPrice: number
  generalPrice: number
  currency: Currency
  checkoutUrl: string
  thumbnailUrl: string | null
  status: MasterclassStatus
  replayUrl: string | null
  replayPublished: boolean
}

function validate(input: MasterclassInput): string | null {
  if (!input.title.trim()) return 'Title is required.'
  if (!input.eventDate) return 'Event date is required.'
  if (Number.isNaN(new Date(input.eventDate).getTime())) return 'Invalid event date.'
  if (!['NGN', 'USD'].includes(input.currency)) return 'Currency must be NGN or USD.'
  if (!['upcoming', 'live', 'past'].includes(input.status)) return 'Invalid status.'
  return null
}

function revalidateAll() {
  revalidatePath('/admin/masterclasses')
  revalidatePath('/masterclass')
  revalidatePath('/')
}

export async function createMasterclass(
  input: MasterclassInput,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const err = validate(input)
  if (err) return { error: err }

  const supabase = createAdminClient()

  const { error } = await supabase.from('masterclasses').insert({
    title: input.title.trim(),
    description: input.description.trim(),
    event_date: new Date(input.eventDate).toISOString(),
    duration_minutes: input.durationMinutes,
    members_price: input.membersPrice,
    general_price: input.generalPrice,
    currency: input.currency,
    checkout_url: input.checkoutUrl.trim(),
    thumbnail_url: input.thumbnailUrl?.trim() || null,
    status: input.status,
  })

  if (error) return { error: error.message }

  revalidateAll()
  redirect('/admin/masterclasses')
}

export async function updateMasterclass(
  input: MasterclassInput & { id: string },
): Promise<{ error: string } | void> {
  await requireAdmin()

  const err = validate(input)
  if (err) return { error: err }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('masterclasses')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      event_date: new Date(input.eventDate).toISOString(),
      duration_minutes: input.durationMinutes,
      members_price: input.membersPrice,
      general_price: input.generalPrice,
      currency: input.currency,
      checkout_url: input.checkoutUrl.trim(),
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      status: input.status,
      replay_url: input.replayUrl?.trim() || null,
      replay_published: input.replayPublished,
    })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidateAll()
  redirect('/admin/masterclasses')
}

export async function deleteMasterclass(
  id: string,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const supabase = createAdminClient()
  const { error } = await supabase.from('masterclasses').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidateAll()
  redirect('/admin/masterclasses')
}
