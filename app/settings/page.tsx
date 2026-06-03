import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationSettings from '@/app/notification-settings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load the current preferences. Default to ON if the row/columns are somehow
  // missing, matching the database default.
  const { data: profile } = await supabase
    .from('profiles')
    .select('notify_daily, notify_streak, notify_masterclass')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-24 pt-10 text-white">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-neutral-400 transition hover:text-[#c9a84c]"
      >
        ← Back
      </Link>

      <h1 className="mb-8 text-3xl font-bold text-[#c9a84c]">Settings</h1>

      <section className="w-full max-w-md">
        <h2 className="mb-1 text-sm uppercase tracking-widest text-neutral-500">
          Notifications
        </h2>
        <NotificationSettings
          userId={user.id}
          initialDaily={profile?.notify_daily ?? true}
          initialStreak={profile?.notify_streak ?? true}
          initialMasterclass={profile?.notify_masterclass ?? true}
        />
      </section>
    </main>
  )
}
