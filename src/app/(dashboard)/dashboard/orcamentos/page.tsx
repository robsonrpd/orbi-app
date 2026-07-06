import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { OrcamentosClient } from './orcamentos-client'

export default async function OrcamentosPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: orcamentos }, { data: contacts }, { data: services }, { data: products }, { data: vendedores }] = await Promise.all([
    service.from('orcamentos').select('*, anexo_url, anexo_nome, contacts(id, name, phone)')
      .eq('company_id', companyId).order('numero', { ascending: false }),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
    service.from('services').select('id, name, price').eq('company_id', companyId).eq('active', true),
    service.from('products' as never).select('id, name, price').eq('company_id', companyId).eq('active', true),
    service.from('vendedores').select('id, nome').eq('company_id', companyId).eq('active', true).order('nome'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Orçamentos" subtitle="Faça orçamentos e converta em vendas" />
      <div className="flex-1 overflow-y-auto p-6">
        <OrcamentosClient
          orcamentos={(orcamentos ?? []) as never}
          contacts={contacts ?? []}
          services={(services ?? []) as never}
          products={(products ?? []) as never}
          vendedores={vendedores ?? []}
        />
      </div>
    </div>
  )
}
