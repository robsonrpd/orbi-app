'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { AppointmentBadge } from '@/components/orbi/status-badge'
import { NovoAgendamentoModal } from '@/components/orbi/novo-agendamento-modal'
import {
  ChevronLeft, ChevronRight, Plus, Filter, Calendar,
  CheckCircle, DollarSign, Clock, X, Search
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; duration_minutes: number; price: number }
type Appointment = {
  id: string; start_at: string; end_at: string; status: string; professional: string | null; notes: string | null
  contacts: Contact | null; services: Service | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  appointments: Appointment[]
  contacts: Contact[]
  services: Service[]
  totalFaturamento: number
}

export function AgendaRedesignClient({ appointments, contacts, services, totalFaturamento }: Props) {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekOffset, setWeekOffset] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('todos')
  const [searchClient, setSearchClient] = useState('')

  // Gera 21 dias a partir do offset
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 7 + i + weekOffset * 7)
    return d
  })

  const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

  const filteredAppointments = appointments.filter(a => {
    const sameDay = new Date(a.start_at).toDateString() === selectedDate.toDateString()
    const matchStatus = statusFilter === 'todos' || a.status === statusFilter
    const matchSearch = !searchClient || (a.contacts?.name ?? a.contacts?.phone ?? '').toLowerCase().includes(searchClient.toLowerCase())
    return sameDay && matchStatus && matchSearch
  })

  const concluded = appointments.filter(a => a.status === 'completed').length
  const finalizarHoje = appointments.filter(a => {
    const d = new Date(a.start_at)
    return d.toDateString() === today.toDateString() && a.status === 'scheduled'
  }).length

  const metrics = [
    { label: 'TOTAL DE AGENDAMENTOS', value: String(appointments.length), icon: Calendar, color: '#1A56FF', bg: '#EEF2FF' },
    { label: 'CONCLUÍDOS', value: String(concluded), icon: CheckCircle, color: '#0DB57A', bg: '#E6F9F3' },
    { label: 'FATURAMENTO DO PERÍODO', value: fmt(totalFaturamento), icon: DollarSign, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'A FINALIZAR HOJE', value: String(finalizarHoje), icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
  ]

  return (
    <>
      <div className="space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-4 gap-4">
          {metrics.map(m => (
            <GlowCard key={m.label}>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#8C8880] uppercase tracking-wider mb-2"
                    style={{ fontFamily: 'Barlow, sans-serif' }}>{m.label}</p>
                  <p className="text-2xl font-black text-[#1C1B18]"
                    style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{m.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: m.bg }}>
                  <m.icon className="size-5" style={{ color: m.color }} strokeWidth={1.5} />
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setModalOpen(true)}
            className="h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.3)' }}>
            <Plus className="size-4" /> Novo Agendamento
          </button>
          <button onClick={() => setFilterOpen(true)}
            className="h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ fontFamily: 'Barlow, sans-serif', background: 'linear-gradient(135deg, #0A0F1E, #1A3A6E)', color: 'white' }}>
            <Filter className="size-4" /> Filtrar Agendamentos
          </button>
        </div>

        {/* Date picker horizontal */}
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setWeekOffset(w => w - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
                <ChevronLeft className="size-4 text-[#8C8880]" />
              </button>
              <span className="text-sm font-semibold text-[#1C1B18] flex-1 text-center">
                {days[0].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
                <ChevronRight className="size-4 text-[#8C8880]" />
              </button>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {days.map((day, i) => {
                const isSelected = day.toDateString() === selectedDate.toDateString()
                const isToday = day.toDateString() === today.toDateString()
                const hasAppts = appointments.some(a => new Date(a.start_at).toDateString() === day.toDateString())
                return (
                  <button key={i} onClick={() => setSelectedDate(day)}
                    className={`shrink-0 w-12 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${isSelected ? 'text-white' : isToday ? 'border border-[#1A56FF]' : 'hover:bg-[#F7F6F3]'}`}
                    style={isSelected ? { background: '#1A56FF', boxShadow: '0 4px 12px rgba(26,86,255,0.4)' } : {}}>
                    <span className={`text-[9px] font-black uppercase tracking-wide ${isSelected ? 'text-white/70' : 'text-[#C8C5BB]'}`}
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      {DAY_NAMES[day.getDay()]}
                    </span>
                    <span className={`text-sm font-black ${isSelected ? 'text-white' : isToday ? 'text-[#1A56FF]' : 'text-[#1C1B18]'}`}
                      style={{ fontFamily: 'Fraunces, serif' }}>
                      {day.getDate()}
                    </span>
                    {hasAppts && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#1A56FF]'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </GlowCard>

        {/* Lista de agendamentos */}
        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                  Agendamentos
                </h3>
                <p className="text-xs text-[#8C8880]">
                  {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''} —{' '}
                  {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#F7F6F3] flex items-center justify-center">
                  <Calendar className="size-6 text-[#EAE8E1]" strokeWidth={1} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#8C8880]">Nenhum agendamento encontrado</p>
                  <p className="text-xs text-[#C8C5BB] mt-0.5">Quando seus clientes agendarem, aparecerão aqui</p>
                </div>
                <button onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#1A56FF] border border-[#1A56FF]/30 hover:bg-[#EEF2FF] transition-colors">
                  <Plus className="size-3.5" /> Criar agendamento
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#F7F6F3]">
                {filteredAppointments.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-4 hover:bg-[#F7F6F3] -mx-2 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-14 text-center px-2 py-2 rounded-xl bg-[#F7F6F3]">
                        <p className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                          {fmtTime(a.start_at)}
                        </p>
                        <p className="text-[10px] text-[#C8C5BB]">{fmtTime(a.end_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-sm font-bold text-[#1A56FF]">
                          {(a.contacts?.name ?? a.contacts?.phone ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1C1B18]">{a.contacts?.name ?? a.contacts?.phone ?? '—'}</p>
                          <p className="text-xs text-[#8C8880]">
                            {a.services?.name ?? 'Serviço não definido'}
                            {a.professional && <span className="text-[#C8C5BB]"> · {a.professional}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                    <AppointmentBadge status={a.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlowCard>
      </div>

      {/* Painel de filtros */}
      {filterOpen && (
        <div className="fixed inset-0 z-40 flex justify-end"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setFilterOpen(false)}>
          <div className="w-80 bg-white h-full shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#1C1B18] flex items-center gap-2"
                style={{ fontFamily: 'Fraunces, serif' }}>
                <Filter className="size-4 text-[#1A56FF]" /> Filtrar Agendamentos
              </h3>
              <button onClick={() => setFilterOpen(false)} className="text-[#8C8880] hover:text-[#1C1B18]">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                Status
              </label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] outline-none focus:border-[#1A56FF]">
                <option value="todos">Todos os Status</option>
                <option value="scheduled">Agendado</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
                <option value="no_show">Faltou</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                Buscar Cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                <input value={searchClient} onChange={e => setSearchClient(e.target.value)}
                  placeholder="Nome ou telefone do cliente"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setStatusFilter('todos'); setSearchClient('') }}
                className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors flex items-center justify-center gap-2">
                <X className="size-4" /> Limpar
              </button>
              <button onClick={() => setFilterOpen(false)}
                className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.3)' }}>
                <Search className="size-4" /> Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <NovoAgendamentoModal open={modalOpen} onClose={() => setModalOpen(false)} contacts={contacts} services={services} />
    </>
  )
}
