'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppSettings } from '@/lib/settings'

const ALLOWED_KEYS: (keyof AppSettings)[] = [
  'notify_daily_enabled',
  'notify_streak_enabled',
  'notify_renewal_enabled',
]

// Flip one global setting on or off. Admin-checked, service-role write.
export async function updateSetting(
  key: keyof AppSettings,
  value: boolean,
): Promise<{ error: string } | void> {
  await requireAdmin()

  // Only allow our known columns — never trust an arbitrary key from the client.
  if (!ALLOWED_KEYS.includes(key)) {
    return { error: 'Unknown setting.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('app_settings')
    .update({ [key]: value })
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
}
