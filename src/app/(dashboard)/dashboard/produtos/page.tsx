import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardNicho } from '@/lib/auth/nicho'
import { Topbar } from '@/components/orbi/topbar'
import { ProdutosClient } from './produtos-client'

export default async function ProdutosPage() {
  await guardNicho('/dashboard/produtos')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: products }, { data: contacts }, { data: vendas }, { data: caixa }] = await Promise.all([
    service.from('products' as never).select('*').eq('company_id', companyId).eq('active', true).order('created_at'),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
    service.from('vendas').select('*, contacts(name, phone)').eq('company_id', companyId).order('numero', { ascending: false }).limit(50),
    service.from('caixas').select('id').eq('company_id', companyId).eq('status', 'aberto').limit(1).single(),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Produtos" subtitle="Estoque, vendas e ponto de venda" />
      <div className="flex-1 overflow-y-auto p-6">
        <ProdutosClient
          products={(products ?? []) as never}
          contacts={contacts ?? []}
          vendas={(vendas ?? []) as never}
          caixaAberto={!!caixa}
        />
      </div>
    </div>
  )
}
