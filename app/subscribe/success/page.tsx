import Link from 'next/link'

export default function SubscribeSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] px-6 pb-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-[#c9a84c] sm:text-4xl">
        Thank you!
      </h1>
      <p className="max-w-sm text-neutral-300">
        Your payment went through. Your subscription will activate in a moment.
      </p>
      <Link
        href="/"
        className="rounded-md bg-[#c9a84c] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#d4b85c]"
      >
        Back to Home
      </Link>
    </main>
  )
}
