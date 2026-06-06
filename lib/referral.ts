import { createAdminClient } from '@/lib/supabase/admin'

// Called from both Stripe and Paystack webhooks after a payment succeeds.
// Finds any pending referral for the new subscriber, marks it converted,
// extends the referrer's subscription by 30 days, then marks it credited.
// All errors are caught and logged — a referral failure must never block
// the payment confirmation.
export async function creditReferrer(referredUserId: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, referrer_id')
      .eq('referred_id', referredUserId)
      .eq('status', 'pending')
      .maybeSingle()

    if (!referral) return

    const now = new Date().toISOString()

    await supabase
      .from('referrals')
      .update({ status: 'converted', converted_at: now })
      .eq('id', referral.id)

    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('current_period_end, subscription_status')
      .eq('id', referral.referrer_id)
      .single()

    const isActiveReferrer =
      referrerProfile?.subscription_status === 'active' ||
      referrerProfile?.subscription_status === 'cancelling'

    if (referrerProfile && isActiveReferrer) {
      const base = referrerProfile.current_period_end
        ? new Date(referrerProfile.current_period_end)
        : new Date()

      const newEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000)

      await supabase
        .from('profiles')
        .update({ current_period_end: newEnd.toISOString() })
        .eq('id', referral.referrer_id)

      await supabase
        .from('referrals')
        .update({ status: 'credited', credited_at: new Date().toISOString() })
        .eq('id', referral.id)

      console.log(`🎁 Referral credited: +30 days for referrer ${referral.referrer_id}`)
    } else {
      console.log(`ℹ️  Referral converted but referrer has no active sub — skipping credit.`)
    }
  } catch (err) {
    console.error('⚠️  creditReferrer error (non-fatal):', err)
  }
}
