import { getAppSettings } from '@/lib/settings'
import SettingsToggles from './settings-toggles'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getAppSettings()
  return <SettingsToggles initial={settings} />
}
