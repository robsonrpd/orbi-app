import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardNicho } from '@/lib/auth/nicho'
import { sugestoesServico } from '@/lib/nichos'
import { Topbar } from '@/components/orbi/topbar'
import { ServicosClient } from './servicos-client'

export default async function ServicosPage() {
  await guardNicho('/dashboard/servicos')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: services }, { data: company }] = await Promise.all([
    service.from('services').select('*').eq('company_id', companyId).eq('active', true).order('created_at'),
    service.from('companies').select('business_type').eq('id', companyId).single(),
  ])
  const sugestoes = sugestoesServico(company?.business_type)

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Serviços" subtitle="Gerencie os serviços do seu negócio" />
      <div className="flex-1 overflow-y-auto p-6">
        <ServicosClient services={services ?? []} sugestoes={sugestoes} />
      </div>
    </div>
  )
}
