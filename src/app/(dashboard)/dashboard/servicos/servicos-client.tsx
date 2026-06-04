'use client'

import { useState, useRef } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { createService, deleteService } from '@/lib/actions/services'
import { Plus, Clock, DollarSign, Edit2, Trash2, Scissors, X, Loader2, Check, Eye, EyeOff } from 'lucide-react'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
  active: boolean
}

const QUICK_SUGGESTIONS = [
  'Consulta de óculos', 'Ajuste de armação', 'Troca de lentes',
  'Exame de vista', 'Limpeza de óculos', 'Montagem de óculos',
  'Adaptação de lente de contato', 'Revisão de óculos',
]

const SERVICE_ICONS = ['👓', '🔭', '🩺', '✨', '🔧', '📋', '💎', '⚡']

export function ServicosClient({ services }: { services: Service[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('60')
  const formRef = useRef<HTMLFormElement>(null)

  function openNew() {
    setEditingService(null)
    setName(''); setPrice(''); setDuration('60'); setError(null)
    setModalOpen(true)
  }

  function openEdit(s: Service) {
    setEditingService(s)
    setName(s.name)
    setPrice(String(s.price))
    setDuration(String(s.duration_minutes))
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const fd = new FormData()
    fd.set('name', name); fd.set('price', price); fd.set('duration', duration)
    const result = await createService(fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setModalOpen(false); setName(''); setPrice(''); setDuration('60')
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteService(id)
    setDeletingId(null)
  }

  const icon = (i: number) => SERVICE_ICONS[i % SERVICE_ICONS.length]

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Meus Serviços
          </h2>
          <p className="text-sm text-[#8C8880] mt-0.5">Gerencie os serviços oferecidos pela sua ótica</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
          <Plus className="size-4" /> Adicionar Serviço
        </button>
      </div>

      {services.length === 0 ? (
        <GlowCard>
          <div className="p-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
              <Scissors className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-[#1C1B18]">Nenhum serviço cadastrado</p>
              <p className="text-sm text-[#8C8880] mt-1">Adicione seus serviços para começar a receber agendamentos.</p>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              <Plus className="size-4" /> Adicionar primeiro serviço
            </button>
          </div>
        </GlowCard>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {services.map((s, i) => (
            <GlowCard key={s.id}>
              <div className="p-5">
                {/* Ícone */}
                <div className="w-full h-28 rounded-xl flex items-center justify-center text-5xl mb-4"
                  style={{ background: 'linear-gradient(135deg, #EEF2FF, #F0F4FF)' }}>
                  {icon(i)}
                </div>

                {/* Info */}
                <h3 className="text-sm font-bold text-[#1C1B18] mb-2 truncate">{s.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                    style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                    <Clock className="size-3" strokeWidth={2} /> {s.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                    style={{ background: '#E6F9F3', color: '#0DB57A' }}>
                    <DollarSign className="size-3" strokeWidth={2} />
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price)}
                  </span>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold text-[#1A56FF] hover:bg-[#EEF2FF] transition-colors border border-[#EAE8E1]">
                    <Edit2 className="size-3.5" /> Editar
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors border border-[#EAE8E1]">
                    {deletingId === s.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Trash2 className="size-3.5" />}
                  </button>
                </div>
              </div>
            </GlowCard>
          ))}

          {/* Card de adicionar */}
          <button onClick={openNew}
            className="rounded-2xl border-2 border-dashed border-[#EAE8E1] flex flex-col items-center justify-center gap-3 p-8 hover:border-[#1A56FF] hover:bg-[#EEF2FF]/30 transition-all group min-h-[200px]">
            <div className="w-10 h-10 rounded-xl bg-[#F7F6F3] group-hover:bg-[#EEF2FF] flex items-center justify-center transition-colors">
              <Plus className="size-5 text-[#C8C5BB] group-hover:text-[#1A56FF] transition-colors" />
            </div>
            <span className="text-sm font-semibold text-[#C8C5BB] group-hover:text-[#1A56FF] transition-colors">
              Novo serviço
            </span>
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Scissors className="size-4 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{editingService ? 'Editar Serviço' : 'Adicionar Serviço'}</p>
                  <p className="text-xs text-white/50">Preencha as informações do serviço</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                  Nome do serviço <span className="text-red-400">*</span>
                </label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Ex: Troca de lentes, Consulta de óculos..."
                  className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Preço (R$) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8C8880]">R$</span>
                    <input value={price} onChange={e => setPrice(e.target.value)} required type="number" step="0.01" min="0"
                      placeholder="0,00"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Duração (min) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                    <input value={duration} onChange={e => setDuration(e.target.value)} required type="number" min="5" step="5"
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all" />
                  </div>
                </div>
              </div>

              {/* Sugestões rápidas */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1"
                  style={{ fontFamily: 'Barlow, sans-serif' }}>
                  ⚡ Sugestões rápidas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map(s => (
                    <button key={s} type="button" onClick={() => setName(s)}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-[#EAE8E1] text-[#8C8880] hover:border-[#1A56FF] hover:text-[#1A56FF] hover:bg-[#EEF2FF] transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar Serviço</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
