import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { AgendaClient } from './agenda-client'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1)
  const weekStart = startOfWeek.toISOString().split('T')[0]
  const weekEnd = new Date(startOfWeek.getTime() + 6 * 86400000).toISOString().split('T')[0]

  const [{ data: appointments }, { data: contacts }, { data: services }] = await Promise.all([
    service.from('appointments')
      .select('id, start_at, end_at, status, contacts(id, name, phone), services(id, name, duration_minutes, price)')
      .eq('company_id', companyId)
      .gte('start_at', weekStart + 'T00:00:00')
      .lte('start_at', weekEnd + 'T23:59:59')
      .order('start_at'),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
    service.from('services').select('id, name, duration_minutes, price').eq('company_id', companyId).eq('active', true),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Agenda" subtitle="Visualização semanal" />
      <div className="flex-1 overflow-y-auto p-6">
        <AgendaClient
          appointments={(appointments ?? []) as never}
          contacts={contacts ?? []}
          services={(services ?? []) as never}
        />
      </div>
    </div>
  )
}
