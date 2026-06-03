import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSubscribeConfigs } from '@/lib/paywall-config'
import Paywall from '@/app/paywall'

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ?country=NG is our local test hook (see lib/geo.ts) — ignored in prod since
  // real visitors don't add it, and even then it only changes which currency
  // they see, never the paywall gate.
  const { country: override } = await searchParams
  const { primary, alt } = await getSubscribeConfigs(override)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-6 pb-24 pt-12">
      <Paywall config={primary} altConfig={alt} />
    </main>
  )
}
