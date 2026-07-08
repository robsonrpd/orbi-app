import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { SettingsForm } from './settings-form'
import { NichoSelector } from '@/components/orbi/nicho-selector'
import { MinhasEmpresas } from '@/components/orbi/minhas-empresas'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const companyId = await getEffectiveCompanyId()
  const { data: company } = await service.from('companies').select('*').eq('id', companyId).single()
  const { data: userRow } = await service.from('users').select('*').eq('id', user!.id).single()
  const userData = { ...userRow, companies: company }
  const waInstance = (company?.settings as { wa_instance?: string } | null)?.wa_instance ?? null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Configurações" subtitle="Gerencie o seu negócio e conta" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <NichoSelector atual={company?.business_type ?? null} />
        <SettingsForm userData={userData} userEmail={user?.email ?? ''} waInstance={waInstance} />
        {userRow?.role !== 'staff' && (
          <div className="max-w-2xl">
            <MinhasEmpresas />
          </div>
        )}
      </div>
    </div>
  )
}
