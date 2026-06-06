'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function JoinRedirector() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      localStorage.setItem('spw_ref', ref)
      router.replace(`/signup?ref=${encodeURIComponent(ref)}`)
    } else {
      router.replace('/signup')
    }
  }, [router, searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <p className="text-sm text-neutral-400">Loading…</p>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
          <p className="text-sm text-neutral-400">Loading…</p>
        </main>
      }
    >
      <JoinRedirector />
    </Suspense>
  )
}
