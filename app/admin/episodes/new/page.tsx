import NewEpisodeForm from './new-form'

// A clicked "missing" day on the calendar links here as /admin/episodes/new?day=47.
// We read that and hand it to the form as a pre-filled starting value.
export default async function NewEpisodePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  const { day } = await searchParams
  return <NewEpisodeForm initialDay={day} />
}
