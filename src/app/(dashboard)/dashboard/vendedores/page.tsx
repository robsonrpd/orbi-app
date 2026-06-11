import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardModo } from '@/lib/auth/modo'
import { Topbar } from '@/components/orbi/topbar'
import { VendedoresClient } from './vendedores-client'

export default async function VendedoresPage() {
  await guardModo('vendedores')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: vendedores }, { data: logins }] = await Promise.all([
    service.from('vendedores').select('*').eq('company_id', companyId).eq('active', true).order('created_at'),
    service.from('users').select('vendedor_id').eq('company_id', companyId).eq('role', 'vendedor'),
  ])
  const comLogin = new Set((logins ?? []).map(l => l.vendedor_id).filter(Boolean))
  const lista = (vendedores ?? []).map(v => ({ ...v, temLogin: comLogin.has(v.id) }))

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Vendedores" subtitle="Equipe de vendas, acessos e permissões" />
      <div className="flex-1 overflow-y-auto p-6">
        <VendedoresClient vendedores={lista as never} />
      </div>
    </div>
  )
}
