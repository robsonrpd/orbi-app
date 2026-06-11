import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardModo } from '@/lib/auth/modo'
import { Topbar } from '@/components/orbi/topbar'
import { RelatoriosClient } from './relatorios-client'

export default async function RelatoriosPage() {
  await guardModo('relatorios')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [
    { data: transactions }, { data: ordens }, { data: orcamentos },
    { data: products }, { data: vendedores }, { data: receitas }, { data: contacts },
  ] = await Promise.all([
    service.from('transactions').select('amount, status, created_at, paid_at, contacts(name, phone)').eq('company_id', companyId),
    service.from('ordens_servico').select('total, medico, vendedor, status, created_at, itens').eq('company_id', companyId),
    service.from('orcamentos').select('total, vendedor, status, created_at, itens').eq('company_id', companyId),
    service.from('products' as never).select('name, price, cost_price, stock, tipo_produto').eq('company_id', companyId).eq('active', true),
    service.from('vendedores').select('nome, comissao_percent').eq('company_id', companyId).eq('active', true),
    service.from('receitas').select('data_receita, contacts(name, phone)').eq('company_id', companyId),
    service.from('contacts').select('name, phone, data_nascimento').eq('company_id', companyId),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Relatórios" subtitle="Análises de vendas, financeiro, estoque e clientes" />
      <div className="flex-1 overflow-y-auto p-6">
        <RelatoriosClient
          transactions={(transactions ?? []) as never}
          ordens={(ordens ?? []) as never}
          orcamentos={(orcamentos ?? []) as never}
          products={(products ?? []) as never}
          vendedores={(vendedores ?? []) as never}
          receitas={(receitas ?? []) as never}
          contacts={(contacts ?? []) as never}
        />
      </div>
    </div>
  )
}
