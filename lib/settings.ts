import { createAdminClient } from '@/lib/supabase/admin'

export type AppSettings = {
  notify_daily_enabled: boolean
  notify_streak_enabled: boolean
  notify_renewal_enabled: boolean
}

// If the row is somehow missing, fall back to "everything on" — the same as the
// column defaults. We never want a missing row to silently disable sends.
const DEFAULTS: AppSettings = {
  notify_daily_enabled: true,
  notify_streak_enabled: true,
  notify_renewal_enabled: true,
}

// Read the single settings row (service-role, so it works from crons that have
// no user session). Always returns a full settings object.
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('app_settings')
    .select('notify_daily_enabled, notify_streak_enabled, notify_renewal_enabled')
    .eq('id', 1)
    .maybeSingle()

  return { ...DEFAULTS, ...(data ?? {}) }
}
