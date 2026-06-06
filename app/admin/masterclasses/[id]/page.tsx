import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import MasterclassForm from '../masterclass-form'
import DeleteMasterclassButton from './delete-button'

export const dynamic = 'force-dynamic'

export default async function EditMasterclassPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: mc } = await supabase
    .from('masterclasses')
    .select('*')
    .eq('id', id)
    .single()

  if (!mc) notFound()

  return (
    <div>
      <MasterclassForm
        existing={{
          id: mc.id,
          title: mc.title,
          description: mc.description,
          eventDate: mc.event_date,
          durationMinutes: mc.duration_minutes,
          membersPrice: Number(mc.members_price),
          generalPrice: Number(mc.general_price),
          currency: mc.currency,
          checkoutUrl: mc.checkout_url,
          replayUrl: mc.replay_url,
          replayPublished: mc.replay_published,
          thumbnailUrl: mc.thumbnail_url,
          status: mc.status,
        }}
      />

      <div className="mt-8 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Danger zone</p>
        <p className="mt-1 text-sm text-red-600">
          Deleting a masterclass is permanent and cannot be undone.
        </p>
        <DeleteMasterclassButton id={mc.id} />
      </div>
    </div>
  )
}
