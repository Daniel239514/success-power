import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './profile-client'

// The Profile screen is the user's "account home": who they are, their
// subscription, notification + timezone prefs, and sign out. This server
// component is the gate + data loader; all rendering happens client-side so
// the editable fields (name, toggles, timezone) can save without a full
// page reload.
export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Logged-out visitors have no profile to show -> send them to log in.
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, avatar_url, subscription_status, subscription_plan, current_period_end, stripe_customer_id, paystack_customer_code, timezone, notify_daily, notify_streak, notify_masterclass',
    )
    .eq('id', user.id)
    .single()

  // Hand everything the client needs down in one bundle. Email lives on the
  // auth user (not the profiles row), so we pass it explicitly.
  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ''}
      fullName={profile?.full_name ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      subscriptionStatus={profile?.subscription_status ?? 'free'}
      subscriptionPlan={profile?.subscription_plan ?? null}
      currentPeriodEnd={profile?.current_period_end ?? null}
      stripeCustomerId={profile?.stripe_customer_id ?? null}
      paystackCustomerCode={profile?.paystack_customer_code ?? null}
      timezone={profile?.timezone ?? null}
      notifyDaily={profile?.notify_daily ?? true}
      notifyStreak={profile?.notify_streak ?? true}
      notifyMasterclass={profile?.notify_masterclass ?? true}
    />
  )
}
