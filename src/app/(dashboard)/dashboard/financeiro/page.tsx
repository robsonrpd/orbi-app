import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardModo } from '@/lib/auth/modo'
import { Topbar } from '@/components/orbi/topbar'
import { FinanceiroRedesignClient } from './financeiro-redesign-client'

export default async function FinanceiroPage() {
  await guardModo('financeiro')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()
  const { data: companyRow } = await service.from('companies').select('slug').eq('id', companyId).single()
  const companySlug = companyRow?.slug ?? 'minha-otica'

  const [{ data: transactions }, { data: contacts }, { data: contasPagar }] = await Promise.all([
    service.from('transactions').select('id, amount, status, due_date, created_at, paid_at, notes, contacts(id, name, phone)')
      .eq('company_id', companyId).order('created_at', { ascending: false }),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
    service.from('contas_pagar' as never).select('*').eq('company_id', companyId).order('vencimento'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Financeiro" subtitle="Controle de cobranças e recebimentos" />
      <div className="flex-1 overflow-y-auto p-6">
        <FinanceiroRedesignClient
          transactions={(transactions ?? []) as never}
          contacts={contacts ?? []}
          companySlug={companySlug}
          contasPagar={(contasPagar ?? []) as never}
        />
      </div>
    </div>
  )
}
