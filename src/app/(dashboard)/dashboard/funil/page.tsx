import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { FunilClient } from './funil-client'

export default async function FunilPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const { data: contacts } = await service
    .from('contacts')
    .select('id, name, phone, origem, funil_etapa, funil_valor, created_at')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Funil de Leads" subtitle="Acompanhe seus contatos do primeiro 'oi' até a venda" />
      <div className="flex-1 overflow-hidden p-6">
        <FunilClient leads={(contacts ?? []) as never} />
      </div>
    </div>
  )
}
