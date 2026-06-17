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
    console.error('Signup error:', error.status, error.code, error.message)
    let msg = error.message && error.message !== '{}' ? error.message : ''
    if (!msg) {
      msg =
        error.status === 504
          ? 'Sign-up is temporarily unavailable. Please try again in a minute.'
          : error.code || 'Sign up failed. Please try again.'
    }
    const qs = new URLSearchParams({ error: msg })
    if (refCode) qs.set('ref', refCode)
    redirect(`/signup?${qs.toString()}`)
  }

  if (data.user) {
    const admin = createAdminClient()

    // Generate a referral code for the new user. This replaces the database
    // trigger (which deadlocked when referral_codes was locked after a DB resume).
    // App-level code can't deadlock — safe to run here unconditionally.
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      for (let attempt = 0; attempt < 10; attempt++) {
        const suffix = Array.from({ length: 6 }, () =>
          chars[Math.floor(Math.random() * chars.length)],
        ).join('')
        const code = `REF-${suffix}`
        const { error: codeErr } = await admin
          .from('referral_codes')
          .insert({ user_id: data.user.id, code })
        if (!codeErr) break // success — unique code inserted
        // unique_violation → retry with a new code; any other error → give up
        if (!codeErr.code?.includes('23505')) break
      }
    } catch {
      // Never block signup for referral code generation.
    }

    // Record the referral relationship if the user arrived via a referral link.
    if (refCode) {
      try {
        const { data: codeRow } = await admin
          .from('referral_codes')
          .select('user_id')
          .eq('code', refCode)
          .maybeSingle()

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
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Account%20created!%20Log%20in%20to%20get%20started.')
}
