import Link from 'next/link'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-4xl font-bold tracking-tight text-[#c9a84c]">
          Log in
        </h1>

        <form action={login} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-white">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-[#c9a84c] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-white">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-[#c9a84c] focus:outline-none"
            />
          </label>

          {message && (
            <p className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-md bg-[#c9a84c] px-3 py-2 font-semibold text-black transition hover:bg-[#d4b85c]"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          New here?{' '}
          <Link href="/signup" className="text-[#c9a84c] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
