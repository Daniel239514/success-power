import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

// Hand the web-push library our identity ONCE, when this module first loads.
// - subject: our contact channel (mailto:) for push-service operators
// - public + private VAPID keys: used to SIGN each push so the push service
//   trusts it came from us.
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// The shape of what we send. The service worker's "push" handler reads these.
export type PushPayload = {
  title: string
  body: string
  url?: string
}

// One row out of the push_subscriptions table.
export type SubscriptionRow = {
  id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
}

// Send a single notification to a single device.
// Returns what happened so callers can tally results.
// If the device's subscription is dead (404/410), we delete the row.
export async function sendToSubscription(
  supabase: SupabaseClient,
  row: SubscriptionRow,
  payload: PushPayload,
): Promise<'sent' | 'deleted' | 'failed'> {
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh_key, auth: row.auth_key },
      },
      JSON.stringify(payload),
    )
    return 'sent'
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode

    // 404 Not Found / 410 Gone = this subscription no longer exists.
    // Delete it so future sends don't keep failing on it.
    if (statusCode === 404 || statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', row.id)
      return 'deleted'
    }

    // Any other error (network, encryption, bad VAPID, etc.) — log and move on.
    console.error(`Push to ${row.endpoint.slice(0, 40)}… failed:`, statusCode, err)
    return 'failed'
  }
}
