import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { ServicosClient } from './servicos-client'

export default async function ServicosPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const { data: services } = await service
    .from('services')
    .select('*')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('created_at')

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Serviços" subtitle="Gerencie os serviços da sua ótica" />
      <div className="flex-1 overflow-y-auto p-6">
        <ServicosClient services={services ?? []} />
      </div>
    </div>
  )
}
