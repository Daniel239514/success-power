'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

type Currency = 'NGN' | 'USD'

export type CourseInput = {
  title: string
  description: string
  price: number
  currency: Currency
  checkoutUrl: string
  thumbnailUrl: string | null
  isActive: boolean
}

function validate(input: CourseInput): string | null {
  if (!input.title.trim()) return 'Title is required.'
  if (!['NGN', 'USD'].includes(input.currency)) return 'Currency must be NGN or USD.'
  return null
}

function revalidateAll() {
  revalidatePath('/admin/courses')
  revalidatePath('/masterclass')
  revalidatePath('/')
}

export async function createCourse(
  input: CourseInput,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const err = validate(input)
  if (err) return { error: err }

  const supabase = createAdminClient()

  const { error } = await supabase.from('course_products').insert({
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    currency: input.currency,
    checkout_url: input.checkoutUrl.trim(),
    thumbnail_url: input.thumbnailUrl?.trim() || null,
    is_active: input.isActive,
  })

  if (error) return { error: error.message }

  revalidateAll()
  redirect('/admin/courses')
}

export async function updateCourse(
  input: CourseInput & { id: string },
): Promise<{ error: string } | void> {
  await requireAdmin()

  const err = validate(input)
  if (err) return { error: err }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('course_products')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      price: input.price,
      currency: input.currency,
      checkout_url: input.checkoutUrl.trim(),
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      is_active: input.isActive,
    })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidateAll()
  redirect('/admin/courses')
}

export async function deleteCourse(
  id: string,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const supabase = createAdminClient()
  const { error } = await supabase.from('course_products').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidateAll()
  redirect('/admin/courses')
}
