import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { ServicosClient } from './servicos-client'

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()

  const { data: services } = await service
    .from('services')
    .select('*')
    .eq('company_id', userData?.company_id)
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
