'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { NovoAgendamentoModal } from '@/components/orbi/novo-agendamento-modal'
import { AppointmentBadge } from '@/components/orbi/status-badge'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; duration_minutes: number; price: number }
type Appointment = {
  id: string
  start_at: string
  end_at: string
  status: string
  contacts: Contact | null
  services: Service | null
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)
const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  appointments: Appointment[]
  contacts: Contact[]
  services: Service[]
  weekOffset?: number
}

export function AgendaClient({ appointments, contacts, services }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [weekDelta, setWeekDelta] = useState(0)

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekDelta * 7)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  return (
    <>
      <div className="bg-white rounded-xl border border-[#EAE8E1]">
        <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekDelta(w => w - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
              <ChevronLeft className="size-4 text-[#8C8880]" />
            </button>
            <span className="text-sm font-semibold text-[#1C1B18]">
              {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} —{' '}
              {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button onClick={() => setWeekDelta(w => w + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
              <ChevronRight className="size-4 text-[#8C8880]" />
            </button>
            {weekDelta !== 0 && (
              <button onClick={() => setWeekDelta(0)}
                className="text-xs text-[#1A56FF] font-medium hover:underline">
                Hoje
              </button>
            )}
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}
            className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
            <CalendarPlus className="size-3.5" /> Novo agendamento
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-[#EAE8E1]">
              <div className="px-3 py-3" />
              {weekDays.map((day, i) => {
                const isToday = day.toDateString() === today.toDateString()
                return (
                  <div key={i} className="px-3 py-3 text-center">
                    <p className="text-xs font-semibold text-[#8C8880] uppercase tracking-wide" style={{ fontFamily: 'Barlow, sans-serif' }}>
                      {DAY_NAMES[i]}
                    </p>
                    <div className={`mt-1 w-7 h-7 mx-auto rounded-full flex items-center justify-center text-sm font-bold ${isToday ? 'bg-[#1A56FF] text-white' : 'text-[#1C1B18]'}`}
                      style={{ fontFamily: 'Fraunces, serif' }}>
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-[#EAE8E1] min-h-[56px]">
                <div className="px-3 py-2 text-xs text-[#C8C5BB] font-medium text-right pt-2">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((day, di) => {
                  const dayAppts = appointments.filter(a => {
                    const aDate = new Date(a.start_at)
                    return aDate.toDateString() === day.toDateString() && aDate.getHours() === hour
                  })
                  return (
                    <div key={di} className="px-1 py-1 border-l border-[#EAE8E1] space-y-1">
                      {dayAppts.map(a => (
                        <div key={a.id} className="bg-[#EEF2FF] border border-[#1A56FF]/20 rounded-md px-2 py-1 cursor-pointer hover:bg-[#1A56FF] hover:text-white transition-colors group">
                          <p className="text-xs font-semibold text-[#1A56FF] group-hover:text-white truncate">
                            {a.contacts?.name ?? a.contacts?.phone ?? '—'}
                          </p>
                          <p className="text-[10px] text-[#8C8880] group-hover:text-white/80 truncate">
                            {a.services?.name ?? 'Serviço'} · {formatTime(a.start_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <NovoAgendamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contacts={contacts}
        services={services}
      />
    </>
  )
}
