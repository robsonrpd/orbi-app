'use client'

import { useState } from 'react'
import { X, Calendar, Clock, RefreshCw, Check, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; duration_minutes: number; price: number }

type Props = {
  onClose: () => void
  contacts: Contact[]
  services: Service[]
}

const RECURRENCE = [
  { key: 'semanal', label: 'Semanal', sub: '7 dias' },
  { key: 'quinzenal', label: 'Quinzenal', sub: '2 semanas' },
  { key: 'mensal', label: 'Mensal', sub: '4 semanas' },
]

// Simulated scheduled history
const MOCK_SCHEDULES = [
  { id: '1', client: 'Maria Silva', service: 'Consulta de óculos', frequency: 'Mensal', next: '10/07/2026', occurrences: 12 },
  { id: '2', client: 'João Costa', service: 'Ajuste de armação', frequency: 'Quinzenal', next: '17/06/2026', occurrences: 6 },
]

export function ProgramarPanel({ onClose, contacts, services }: Props) {
  const [tab, setTab] = useState<'programar' | 'gerenciar'>('programar')
  const [contactSearch, setContactSearch] = useState('')
  const [showContacts, setShowContacts] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [baseDate, setBaseDate] = useState(new Date().toISOString().split('T')[0])
  const [baseTime, setBaseTime] = useState('09:00')
  const [recurrence, setRecurrence] = useState('semanal')
  const [occurrences, setOccurrences] = useState(12)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const filteredContacts = contacts.filter(c =>
    contactSearch.length > 0 &&
    (c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
  ).slice(0, 5)

  async function handleSave() {
    if (!selectedContact || !baseDate || !baseTime) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); onClose() }, 1500)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(10,15,30,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-96 bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between shrink-0"
          style={{ background: 'linear-gradient(135deg, #0D1635, #1A56FF)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Calendar className="size-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Programar Agendamentos</p>
              <p className="text-xs text-white/50">Crie horários fixos e recorrentes em lote.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors mt-0.5">
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#EAE8E1] shrink-0">
          {(['programar', 'gerenciar'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-[#1A56FF] border-b-2 border-[#1A56FF]' : 'text-[#8C8880] hover:text-[#2E2D29]'}`}>
              {t === 'programar' ? 'Programar' : 'Gerenciar Horários'}
            </button>
          ))}
        </div>

        {tab === 'programar' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Step 1 */}
            <div className="rounded-xl border border-[#EAE8E1] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F6F3] border-b border-[#EAE8E1]">
                <div className="w-6 h-6 rounded-full bg-[#1A56FF] flex items-center justify-center text-[10px] font-black text-white" style={{ fontFamily: 'Barlow, sans-serif' }}>1</div>
                <div>
                  <p className="text-sm font-bold text-[#1C1B18]">Cliente e serviços</p>
                  <p className="text-xs text-[#8C8880]">Busque um cliente existente.</p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Busca cliente */}
                <div className="relative">
                  <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Nome do Cliente
                  </label>
                  <input value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); setSelectedContact(null); setShowContacts(true) }}
                    onFocus={() => setShowContacts(true)}
                    placeholder="Digite o nome do cliente..."
                    className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
                  {showContacts && filteredContacts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#EAE8E1] rounded-xl shadow-lg overflow-hidden">
                      {filteredContacts.map(c => (
                        <button key={c.id} type="button" onClick={() => { setSelectedContact(c); setContactSearch(c.name ?? c.phone); setShowContacts(false) }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#F7F6F3] transition-colors border-b border-[#EAE8E1] last:border-0">
                          <p className="text-sm font-medium text-[#1C1B18]">{c.name ?? 'Sem nome'}</p>
                          <p className="text-xs text-[#8C8880]">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedContact && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#EEF2FF] rounded-xl border border-[#1A56FF]/20">
                      <div className="w-6 h-6 rounded-full bg-[#1A56FF] flex items-center justify-center text-[10px] font-bold text-white">
                        {(selectedContact.name ?? selectedContact.phone)[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#1A56FF]">{selectedContact.name ?? selectedContact.phone}</p>
                        <p className="text-[10px] text-[#8C8880]">{selectedContact.phone}</p>
                      </div>
                      <Check className="size-3.5 text-[#1A56FF]" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Serviços */}
                <div>
                  <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-2" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Serviços
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {services.map(s => (
                      <button key={s.id} onClick={() => setSelectedService(selectedService?.id === s.id ? null : s)}
                        className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${selectedService?.id === s.id ? 'border-[#1A56FF] bg-[#EEF2FF] text-[#1A56FF]' : 'border-[#EAE8E1] text-[#8C8880] hover:border-[#1A56FF]/30'}`}>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedService?.id === s.id ? 'border-[#1A56FF] bg-[#1A56FF]' : 'border-[#C8C5BB]'}`}>
                          {selectedService?.id === s.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span>{s.name}</span>
                        <span className="text-[#8C8880]">R${s.price} · {s.duration_minutes}min</span>
                      </button>
                    ))}
                    {services.length === 0 && (
                      <p className="text-xs text-[#C8C5BB] py-2">Cadastre serviços primeiro</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-[#EAE8E1] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F6F3] border-b border-[#EAE8E1]">
                <div className="w-6 h-6 rounded-full bg-[#1A56FF] flex items-center justify-center text-[10px] font-black text-white" style={{ fontFamily: 'Barlow, sans-serif' }}>2</div>
                <div>
                  <p className="text-sm font-bold text-[#1C1B18]">Data e horário base</p>
                  <p className="text-xs text-[#8C8880]">Defina o primeiro horário da recorrência.</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    📅 Data Base
                  </label>
                  <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    🕐 Horário Base
                  </label>
                  <input type="time" value={baseTime} onChange={e => setBaseTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-[#EAE8E1] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F6F3] border-b border-[#EAE8E1]">
                <div className="w-6 h-6 rounded-full bg-[#1A56FF] flex items-center justify-center text-[10px] font-black text-white" style={{ fontFamily: 'Barlow, sans-serif' }}>3</div>
                <div>
                  <p className="text-sm font-bold text-[#1C1B18]">Recorrência simplificada</p>
                  <p className="text-xs text-[#8C8880]">Escolha o intervalo de repetição.</p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-2" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    <RefreshCw className="size-3" /> Repetir a cada
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {RECURRENCE.map(r => (
                      <button key={r.key} onClick={() => setRecurrence(r.key)}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all ${recurrence === r.key ? 'text-white' : 'bg-[#F7F6F3] text-[#8C8880] hover:bg-[#EEF2FF]'}`}
                        style={recurrence === r.key ? { background: '#1A56FF', boxShadow: '0 4px 12px rgba(26,86,255,0.3)', fontFamily: 'Barlow, sans-serif' } : { fontFamily: 'Barlow, sans-serif' }}>
                        {r.label}<br /><span className="font-normal text-[10px] opacity-70">{r.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-2" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    # Quantas Ocorrências
                  </label>
                  <input type="number" value={occurrences} min={1} max={50}
                    onChange={e => setOccurrences(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
                  <p className="text-[10px] text-[#C8C5BB] mt-1">Máx. 50</p>
                </div>

                {/* Preview */}
                {selectedContact && baseDate && (
                  <div className="bg-[#EEF2FF] rounded-xl p-3 border border-[#1A56FF]/20">
                    <p className="text-xs font-semibold text-[#1A56FF] mb-1">Resumo</p>
                    <p className="text-xs text-[#2E2D29]">
                      <strong>{occurrences} agendamentos</strong> para {selectedContact.name ?? selectedContact.phone},
                      a cada <strong>{RECURRENCE.find(r => r.key === recurrence)?.label.toLowerCase()}</strong>,
                      a partir de <strong>{new Date(baseDate + 'T12:00:00').toLocaleDateString('pt-BR')} às {baseTime}</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Aba Gerenciar */
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-[#1C1B18]">Gerenciador de Horários</p>
                <p className="text-xs text-[#8C8880]">Veja e remova programações ativas.</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-[#1A56FF] font-medium hover:underline">
                <RefreshCw className="size-3.5" /> Atualizar
              </button>
            </div>

            {MOCK_SCHEDULES.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Calendar className="size-10 text-[#EAE8E1]" strokeWidth={1} />
                <p className="text-sm text-[#C8C5BB] text-center">Nenhuma programação encontrada.<br />Crie um agendamento recorrente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {MOCK_SCHEDULES.map(s => (
                  <div key={s.id} className="rounded-xl border border-[#EAE8E1] p-4 hover:border-[#1A56FF]/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#1C1B18]">{s.client}</p>
                        <p className="text-xs text-[#8C8880]">{s.service}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#1A56FF]" style={{ fontFamily: 'Barlow, sans-serif' }}>
                            {s.frequency}
                          </span>
                          <span className="text-[10px] text-[#8C8880]">{s.occurrences}x · Próx: {s.next}</span>
                        </div>
                      </div>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {tab === 'programar' && (
          <div className="p-5 border-t border-[#EAE8E1] shrink-0">
            <button onClick={handleSave}
              disabled={loading || !selectedContact || !baseDate}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              {loading ? <Loader2 className="size-4 animate-spin" />
                : success ? <><Check className="size-4" /> Agendamentos criados!</>
                : <><Calendar className="size-4" /> Salvar Programação</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
