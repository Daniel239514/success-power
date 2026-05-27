import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function EpisodesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('*')
    .order('day_number', { ascending: true })

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] px-6 py-12 text-white">
        <p>Could not load episodes: {error.message}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-24 pt-12">
      <h1 className="mb-8 text-3xl font-bold text-[#c9a84c]">Episodes</h1>

      <ul className="flex flex-col gap-4">
        {episodes?.map((ep) => (
          <li key={ep.id}>
            <Link
              href={`/episodes/${ep.day_number}`}
              className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-[#c9a84c]"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-full bg-[#c9a84c] px-3 py-1 text-xs font-bold text-black">
                  DAY {ep.day_number}
                </span>
                <h2 className="text-lg font-semibold text-white">{ep.title}</h2>
              </div>
              <p className="text-sm text-neutral-400">{ep.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
