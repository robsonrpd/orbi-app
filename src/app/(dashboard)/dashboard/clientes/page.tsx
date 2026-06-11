import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { ClientesClient } from './clientes-client'

export default async function ClientesPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: contacts }, { data: transactions }, { data: appointments }, { data: vendas }] = await Promise.all([
    service.from('contacts').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    service.from('transactions').select('contact_id, amount, status, forma_pagamento').eq('company_id', companyId),
    service.from('appointments').select('contact_id').eq('company_id', companyId),
    service.from('vendas').select('contact_id, itens').eq('company_id', companyId),
  ])

  type Stat = {
    totalGasto: number; numAgendamentos: number; numCompras: number
    devendo: number; formas: Record<string, number>; produtos: string[]
  }
  const stats: Record<string, Stat> = {}
  const ensure = (id: string): Stat => (stats[id] ??= {
    totalGasto: 0, numAgendamentos: 0, numCompras: 0, devendo: 0, formas: {}, produtos: [],
  })
  ;(transactions ?? []).forEach(t => {
    if (!t.contact_id) return
    const s = ensure(t.contact_id)
    if (t.status === 'paid') {
      s.totalGasto += Number(t.amount); s.numCompras += 1
      const f = t.forma_pagamento || 'Outro'
      s.formas[f] = (s.formas[f] ?? 0) + 1
    } else if (t.status === 'pending' || t.status === 'overdue') {
      s.devendo += Number(t.amount)
    }
  })
  ;(appointments ?? []).forEach(a => { if (a.contact_id) ensure(a.contact_id).numAgendamentos += 1 })
  ;(vendas ?? []).forEach(v => {
    if (!v.contact_id || !Array.isArray(v.itens)) return
    const s = ensure(v.contact_id)
    ;(v.itens as { nome?: string }[]).forEach(it => {
      if (it?.nome && s.produtos.length < 12 && !s.produtos.includes(it.nome)) s.produtos.push(it.nome)
    })
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Clientes" subtitle={`${contacts?.length ?? 0} clientes cadastrados`} />
      <div className="flex-1 overflow-y-auto p-6">
        <ClientesClient contacts={(contacts ?? []) as never} stats={stats} />
      </div>
    </div>
  )
}
