import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { VendedoresClient } from './vendedores-client'

export default async function VendedoresPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const { data: vendedores } = await service
    .from('vendedores').select('*')
    .eq('company_id', companyId).eq('active', true).order('created_at')

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Vendedores" subtitle="Equipe de vendas e comissões" />
      <div className="flex-1 overflow-y-auto p-6">
        <VendedoresClient vendedores={(vendedores ?? []) as never} />
      </div>
    </div>
  )
}
