import Link from 'next/link'

export default function SubscribeCancelledPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] px-6 pb-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Checkout cancelled
      </h1>
      <p className="max-w-sm text-neutral-400">
        No worries — you have not been charged. You can subscribe any time.
      </p>
      <Link
        href="/subscribe"
        className="rounded-md border border-[#c9a84c] px-6 py-3 text-sm font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c]/10"
      >
        Back to plans
      </Link>
    </main>
  )
}
