import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { ClientesClient } from './clientes-client'

export default async function ClientesPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: contacts }, { data: transactions }, { data: appointments }] = await Promise.all([
    service.from('contacts').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    service.from('transactions').select('contact_id, amount, status').eq('company_id', companyId),
    service.from('appointments').select('contact_id').eq('company_id', companyId),
  ])

  // Stats por cliente (total gasto, nº compras, nº agendamentos)
  const stats: Record<string, { totalGasto: number; numAgendamentos: number; numCompras: number }> = {}
  const ensure = (id: string) => (stats[id] ??= { totalGasto: 0, numAgendamentos: 0, numCompras: 0 })
  ;(transactions ?? []).forEach(t => {
    if (!t.contact_id || t.status !== 'paid') return
    const s = ensure(t.contact_id); s.totalGasto += Number(t.amount); s.numCompras += 1
  })
  ;(appointments ?? []).forEach(a => { if (a.contact_id) ensure(a.contact_id).numAgendamentos += 1 })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Clientes" subtitle={`${contacts?.length ?? 0} clientes cadastrados`} />
      <div className="flex-1 overflow-y-auto p-6">
        <ClientesClient contacts={(contacts ?? []) as never} stats={stats} />
      </div>
    </div>
  )
}
