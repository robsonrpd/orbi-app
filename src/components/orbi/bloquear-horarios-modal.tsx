'use client'

import { useState } from 'react'
import { X, Ban, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = { onClose: () => void }

function generateSlots(open: string, close: string, intervalMin: number): string[] {
  const slots: string[] = []
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  let cur = openH * 60 + openM
  const end = closeH * 60 + closeM
  while (cur < end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0')
    const m = String(cur % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += intervalMin
  }
  return slots
}

export function BloquearHorariosModal({ onClose }: Props) {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(today)
  const [dayOffset, setDayOffset] = useState(0)
  const [blocked, setBlocked] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i + dayOffset * 7)
    return d
  })

  const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
  const slots = generateSlots('09:00', '18:00', 30)
  const dateKey = selectedDate.toISOString().split('T')[0]
  const blockedForDay = blocked[dateKey] ?? []

  function toggleSlot(slot: string) {
    setBlocked(prev => {
      const current = prev[dateKey] ?? []
      const updated = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot]
      return { ...prev, [dateKey]: updated }
    })
  }

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #7F1D1D, #EF4444)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Ban className="size-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Bloquear Horários</p>
              <p className="text-xs text-white/60">Selecione os horários que não estarão disponíveis.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Seletor de data */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1.5"
                style={{ fontFamily: 'Barlow, sans-serif' }}>
                📅 Data
              </label>
              <div className="flex items-center gap-1">
                <button onClick={() => setDayOffset(d => d - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#EAE8E1] hover:bg-[#F7F6F3]">
                  <ChevronLeft className="size-3.5 text-[#8C8880]" />
                </button>
                <button onClick={() => setDayOffset(d => d + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#EAE8E1] hover:bg-[#F7F6F3]">
                  <ChevronRight className="size-3.5 text-[#8C8880]" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day, i) => {
                const isSelected = day.toDateString() === selectedDate.toDateString()
                const isToday = day.toDateString() === today.toDateString()
                const dKey = day.toISOString().split('T')[0]
                const hasBlocked = (blocked[dKey] ?? []).length > 0
                return (
                  <button key={i} onClick={() => setSelectedDate(day)}
                    className={`shrink-0 w-16 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${isSelected ? 'text-white border-transparent' : 'border-[#EAE8E1] hover:border-red-300'}`}
                    style={isSelected ? { background: 'linear-gradient(135deg, #DC2626, #EF4444)', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' } : {}}>
                    <span className={`text-[9px] font-black uppercase tracking-wide ${isSelected ? 'text-white/70' : 'text-[#C8C5BB]'}`}
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      {DAY_NAMES[day.getDay()]}
                    </span>
                    <span className={`text-base font-black ${isSelected ? 'text-white' : isToday ? 'text-red-500' : 'text-[#1C1B18]'}`}
                      style={{ fontFamily: 'Fraunces, serif' }}>
                      {day.getDate()}
                    </span>
                    <span className={`text-[9px] ${isSelected ? 'text-white/60' : 'text-[#C8C5BB]'}`}
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      {day.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                    </span>
                    {hasBlocked && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1.5"
                style={{ fontFamily: 'Barlow, sans-serif' }}>
                🕐 Horários Disponíveis
              </label>
              <div className="flex items-center gap-3 text-[10px]" style={{ fontFamily: 'Barlow, sans-serif' }}>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0DB57A]" /> Livre</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Bloqueado</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#C8C5BB]" /> Ocupado</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {slots.map(slot => {
                const isBlocked = blockedForDay.includes(slot)
                return (
                  <button key={slot} onClick={() => toggleSlot(slot)}
                    className={`h-10 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.97] ${isBlocked
                      ? 'border-red-300 bg-red-50 text-red-500'
                      : 'border-[#0DB57A]/30 bg-[#E6F9F3] text-[#0DB57A] hover:border-red-300 hover:bg-red-50 hover:text-red-500'}`}
                    style={{ fontFamily: 'Barlow, sans-serif' }}>
                    {slot}
                  </button>
                )
              })}
            </div>
            {blockedForDay.length > 0 && (
              <p className="text-xs text-red-500 mt-2 font-medium">
                {blockedForDay.length} horário{blockedForDay.length > 1 ? 's' : ''} bloqueado{blockedForDay.length > 1 ? 's' : ''} neste dia. Clique novamente para desbloquear.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors flex items-center justify-center gap-2">
              <X className="size-4" /> Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)', fontFamily: 'Barlow, sans-serif' }}>
              {saving ? <Loader2 className="size-4 animate-spin" />
                : saved ? <><Check className="size-4" /> Salvo!</>
                : <><Ban className="size-4" /> Salvar Alterações</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
