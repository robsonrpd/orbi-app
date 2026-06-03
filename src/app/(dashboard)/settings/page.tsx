import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const { data: userData } = await service.from('users').select('*, companies(*)').eq('id', user!.id).single()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Configurações" subtitle="Gerencie o seu negócio e conta" />
      <div className="flex-1 overflow-y-auto p-6">
        <SettingsForm userData={userData} userEmail={user?.email ?? ''} />
      </div>
    </div>
  )
}
