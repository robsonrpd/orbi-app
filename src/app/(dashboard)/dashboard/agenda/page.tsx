import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { AgendaRedesignClient } from './agenda-redesign-client'

export default async function AgendaPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString()

  const [{ data: appointments }, { data: contacts }, { data: services }, { data: transactions }] = await Promise.all([
    service.from('appointments')
      .select('id, start_at, end_at, status, professional, notes, contacts(id, name, phone), services(id, name, duration_minutes, price)')
      .eq('company_id', companyId)
      .gte('start_at', monthStart)
      .lte('start_at', monthEnd)
      .order('start_at'),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
    service.from('services').select('id, name, duration_minutes, price').eq('company_id', companyId).eq('active', true),
    service.from('transactions').select('amount').eq('company_id', companyId).eq('status', 'paid').gte('created_at', monthStart),
  ])

  const totalFaturamento = (transactions ?? []).reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Agendamentos" subtitle="Gerencie todos os agendamentos da sua ótica" />
      <div className="flex-1 overflow-y-auto p-5">
        <AgendaRedesignClient
          appointments={(appointments ?? []) as never}
          contacts={contacts ?? []}
          services={(services ?? []) as never}
          totalFaturamento={totalFaturamento}
        />
      </div>
    </div>
  )
}
