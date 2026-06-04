'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { saveSchedule } from '@/lib/actions/services'
import { Check, Loader2, RefreshCw } from 'lucide-react'

const DAYS = [
  { key: 'dom', label: 'Domingo' },
  { key: 'seg', label: 'Segunda-feira' },
  { key: 'ter', label: 'Terça-feira' },
  { key: 'qua', label: 'Quarta-feira' },
  { key: 'qui', label: 'Quinta-feira' },
  { key: 'sex', label: 'Sexta-feira' },
  { key: 'sab', label: 'Sábado' },
]

const DEFAULT_SCHEDULE = Object.fromEntries(
  DAYS.map(d => [d.key, { open: '09:00', close: '18:00', active: d.key !== 'dom' }])
)

const INTERVALS = [15, 30, 45, 60]

type ScheduleDay = { open: string; close: string; active: boolean }

export function FuncionamentoClient({ initialSchedule, initialInterval }: {
  initialSchedule: Record<string, ScheduleDay>
  initialInterval: number
}) {
  const [schedule, setSchedule] = useState<Record<string, ScheduleDay>>(
    Object.keys(DEFAULT_SCHEDULE).reduce((acc, key) => ({
      ...acc,
      [key]: initialSchedule[key] ?? DEFAULT_SCHEDULE[key]
    }), {} as Record<string, ScheduleDay>)
  )
  const [interval, setInterval] = useState(initialInterval || 30)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleDay(key: string) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }))
  }

  function setTime(key: string, field: 'open' | 'close', value: string) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    await saveSchedule(schedule, interval)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    setSchedule(DEFAULT_SCHEDULE)
    setInterval(30)
  }

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Horários */}
      <GlowCard>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📅</span>
            <h2 className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
              Horários de Atendimento
            </h2>
          </div>
          <p className="text-sm text-[#8C8880] mb-6">Configure os dias e horários que você atende</p>

          <div className="grid grid-cols-4 gap-3">
            {DAYS.map(day => {
              const d = schedule[day.key]
              return (
                <div key={day.key}
                  className={`rounded-xl border-2 p-4 transition-all ${d.active ? 'border-[#1A56FF] bg-[#EEF2FF]/30' : 'border-[#EAE8E1] bg-[#F7F6F3] opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-[#1C1B18]">{day.label}</span>
                    <button onClick={() => toggleDay(day.key)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${d.active ? 'bg-[#1A56FF]' : 'bg-[#EAE8E1]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${d.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {d.active ? (
                    <>
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-[10px] font-bold text-[#1A56FF] bg-[#EEF2FF] px-2 py-0.5 rounded-full"
                          style={{ fontFamily: 'Barlow, sans-serif' }}>
                          {d.open} - {d.close}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-[#8C8880] mb-1 uppercase tracking-wide font-semibold"
                            style={{ fontFamily: 'Barlow, sans-serif' }}>Abertura</p>
                          <input type="time" value={d.open} onChange={e => setTime(day.key, 'open', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-[#EAE8E1] text-xs text-[#1C1B18] outline-none focus:border-[#1A56FF]" />
                        </div>
                        <div>
                          <p className="text-[10px] text-[#8C8880] mb-1 uppercase tracking-wide font-semibold"
                            style={{ fontFamily: 'Barlow, sans-serif' }}>Fechamento</p>
                          <input type="time" value={d.close} onChange={e => setTime(day.key, 'close', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-[#EAE8E1] text-xs text-[#1C1B18] outline-none focus:border-[#1A56FF]" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-[#C8C5BB] text-center mt-2">Fechado</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </GlowCard>

      {/* Intervalo */}
      <GlowCard>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚙️</span>
            <h2 className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
              Configurações de Agendamento
            </h2>
          </div>
          <p className="text-sm text-[#8C8880] mb-5">Defina o intervalo entre cada atendimento</p>

          <div>
            <p className="text-sm font-semibold text-[#2E2D29] mb-3">Intervalo entre agendamentos:</p>
            <div className="grid grid-cols-4 gap-3">
              {INTERVALS.map(min => (
                <button key={min} onClick={() => setInterval(min)}
                  className={`h-12 rounded-xl text-sm font-bold transition-all ${interval === min
                    ? 'text-white shadow-lg'
                    : 'text-[#8C8880] bg-[#F7F6F3] hover:bg-[#EEF2FF] hover:text-[#1A56FF]'}`}
                  style={interval === min ? {
                    fontFamily: 'Barlow, sans-serif',
                    background: 'linear-gradient(135deg, #1A56FF, #1445DD)',
                    boxShadow: '0 4px 16px rgba(26,86,255,0.35)'
                  } : { fontFamily: 'Barlow, sans-serif' }}>
                  {min} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3">
        <button onClick={handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#8C8880] border border-[#EAE8E1] hover:text-[#2E2D29] transition-colors">
          <RefreshCw className="size-4" /> Restaurar padrão
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
          {saving ? <Loader2 className="size-4 animate-spin" />
            : saved ? <><Check className="size-4" /> Salvo!</>
            : <><Check className="size-4" /> Salvar Configurações</>}
        </button>
      </div>
    </div>
  )
}
