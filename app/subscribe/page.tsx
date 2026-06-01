import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Paywall from '@/app/paywall'

export default async function SubscribePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-6 pb-24 pt-12">
      <Paywall />
    </main>
  )
}
