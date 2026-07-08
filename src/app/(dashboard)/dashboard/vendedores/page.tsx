import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardModo } from '@/lib/auth/modo'
import { termoEquipe, nichoEsconde } from '@/lib/nichos'
import { Topbar } from '@/components/orbi/topbar'
import { VendedoresClient } from './vendedores-client'

export default async function VendedoresPage() {
  await guardModo('vendedores')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: vendedores }, { data: logins }, { data: company }] = await Promise.all([
    service.from('vendedores').select('*').eq('company_id', companyId).eq('active', true).order('created_at'),
    service.from('users').select('vendedor_id').eq('company_id', companyId).eq('role', 'staff'),
    service.from('companies').select('business_type').eq('id', companyId).single(),
  ])
  const comLogin = new Set((logins ?? []).map(l => l.vendedor_id).filter(Boolean))
  const lista = (vendedores ?? []).map(v => ({ ...v, temLogin: comLogin.has(v.id) }))
  const equipe = termoEquipe(company?.business_type)
  const esconderNicho = nichoEsconde(company?.business_type)

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title={equipe.plural} subtitle={`Equipe, acessos e permissões`} />
      <div className="flex-1 overflow-y-auto p-6">
        <VendedoresClient vendedores={lista as never} termo={equipe} esconderNicho={esconderNicho} />
      </div>
    </div>
  )
}
