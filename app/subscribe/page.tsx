import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubscribeButtons from './subscribe-buttons'

export default async function SubscribePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a] px-6 pb-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#c9a84c] sm:text-4xl">
          Go Premium
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Unlock the full Success Power program.
        </p>
      </div>

      <SubscribeButtons />

      <p className="text-center text-xs text-neutral-600">
        Test mode — use card 4242 4242 4242 4242. No real money is charged.
      </p>
    </main>
  )
}
