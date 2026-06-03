import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { AppointmentBadge } from '@/components/orbi/status-badge'
import { Button } from '@/components/ui/button'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const weekStart = weekDays[0].toISOString().split('T')[0]
  const weekEnd = weekDays[6].toISOString().split('T')[0]

  const { data: appointments } = await service
    .from('appointments')
    .select('*, contacts(name, phone), services(name, duration_minutes)')
    .eq('company_id', companyId)
    .gte('start_at', weekStart + 'T00:00:00')
    .lte('start_at', weekEnd + 'T23:59:59')
    .order('start_at')

  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Agenda" subtitle="Visualização semanal" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-[#EAE8E1]">
          {/* Header da semana */}
          <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
                <ChevronLeft className="size-4 text-[#8C8880]" />
              </button>
              <span className="text-sm font-semibold text-[#1C1B18]">
                {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} —{' '}
                {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
                <ChevronRight className="size-4 text-[#8C8880]" />
              </button>
            </div>
            <Button size="sm" className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
              <CalendarPlus className="size-3.5" /> Novo agendamento
            </Button>
          </div>

          {/* Grid semanal */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Cabeçalho dos dias */}
              <div className="grid grid-cols-8 border-b border-[#EAE8E1]">
                <div className="px-3 py-3 text-xs text-[#C8C5BB]" />
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === today.toDateString()
                  return (
                    <div key={i} className="px-3 py-3 text-center">
                      <p className="text-xs font-semibold text-[#8C8880] uppercase tracking-wide" style={{ fontFamily: 'Barlow, sans-serif' }}>
                        {dayNames[i]}
                      </p>
                      <div className={`mt-1 w-7 h-7 mx-auto rounded-full flex items-center justify-center text-sm font-bold ${
                        isToday ? 'bg-[#1A56FF] text-white' : 'text-[#1C1B18]'
                      }`} style={{ fontFamily: 'Fraunces, serif' }}>
                        {day.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Linhas de hora */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-[#EAE8E1] min-h-[56px]">
                  <div className="px-3 py-2 text-xs text-[#C8C5BB] font-medium text-right">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {weekDays.map((day, di) => {
                    const dayAppts = (appointments ?? []).filter((a: Record<string, unknown>) => {
                      const aDate = new Date(a.start_at as string)
                      return aDate.toDateString() === day.toDateString() && aDate.getHours() === hour
                    })
                    return (
                      <div key={di} className="px-1 py-1 border-l border-[#EAE8E1] space-y-1">
                        {dayAppts.map((a: Record<string, unknown>) => {
                          const contact = a.contacts as { name?: string; phone?: string } | null
                          const svc = a.services as { name?: string } | null
                          return (
                            <div key={a.id as string} className="bg-[#EEF2FF] border border-[#1A56FF]/20 rounded-md px-2 py-1 cursor-pointer hover:bg-[#1A56FF] hover:text-white transition-colors group">
                              <p className="text-xs font-semibold text-[#1A56FF] group-hover:text-white truncate">
                                {contact?.name ?? contact?.phone ?? '—'}
                              </p>
                              <p className="text-[10px] text-[#8C8880] group-hover:text-white/80 truncate">
                                {svc?.name ?? 'Serviço'} · {formatTime(a.start_at as string)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
