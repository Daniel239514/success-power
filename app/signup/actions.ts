'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const refCode = ((formData.get('ref') as string) || '').trim().toUpperCase() || null

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    const qs = new URLSearchParams({ error: error.message })
    if (refCode) qs.set('ref', refCode)
    redirect(`/signup?${qs.toString()}`)
  }

  // Record the referral if a valid code was passed and signup succeeded.
  if (refCode && data.user) {
    try {
      const admin = createAdminClient()

      const { data: codeRow } = await admin
        .from('referral_codes')
        .select('user_id')
        .eq('code', refCode)
        .maybeSingle()

      // Only insert if the code exists and the referrer isn't the same person.
      if (codeRow && codeRow.user_id !== data.user.id) {
        await admin.from('referrals').insert({
          referrer_id: codeRow.user_id,
          referred_id: data.user.id,
          status: 'pending',
        })
      }
    } catch {
      // Silently ignore: duplicate referral, code not found, etc.
    }
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Check%20your%20email%20to%20confirm%20your%20account%2C%20then%20log%20in.')
}
