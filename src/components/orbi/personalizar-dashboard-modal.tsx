'use client'

import { useState } from 'react'
import { salvarPersonalizacaoDashboard, restaurarDashboardPadrao, type DashboardItemState } from '@/lib/actions/dashboard-config'
import { X, ChevronUp, ChevronDown, Check, Loader2, RotateCcw, LayoutGrid } from 'lucide-react'

type Props = {
  open: boolean
  isGeral: boolean
  kpis: DashboardItemState[]
  resumo: DashboardItemState[]
  secoes: DashboardItemState[]
  onClose: () => void
  onSalvo: () => void
}

function Lista({ titulo, itens, setItens }: { titulo: string; itens: DashboardItemState[]; setItens: (f: (prev: DashboardItemState[]) => DashboardItemState[]) => void }) {
  function alternar(i: number) {
    setItens(prev => prev.map((it, idx) => idx === i ? { ...it, visivel: !it.visivel } : it))
  }
  function mover(i: number, dir: -1 | 1) {
    setItens(prev => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const novo = [...prev]
      ;[novo[i], novo[j]] = [novo[j], novo[i]]
      return novo
    })
  }
  return (
    <div>
      <p className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider mb-2">{titulo}</p>
      <div className="space-y-1.5">
        {itens.map((it, i) => (
          <div key={it.key} className="flex items-center gap-2 rounded-lg border border-[#EAE8E1] px-2.5 py-2">
            <button type="button" onClick={() => alternar(i)}
              className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
              style={{ background: it.visivel ? '#1A56FF' : '#EAE8E1' }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: it.visivel ? '18px' : '2px' }} />
            </button>
            <span className={`flex-1 text-sm font-medium ${it.visivel ? 'text-[#1C1B18]' : 'text-[#C8C5BB]'}`}>{it.label}</span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PersonalizarDashboardModal({ open, isGeral, kpis, resumo, secoes, onClose, onSalvo }: Props) {
  const [itensKpis, setItensKpis] = useState(kpis)
  const [itensResumo, setItensResumo] = useState(resumo)
  const [itensSecoes, setItensSecoes] = useState(secoes)
  const [salvando, setSalvando] = useState(false)
  const [restaurando, setRestaurando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function salvar() {
    setSalvando(true); setError(null)
    const r = await salvarPersonalizacaoDashboard({ kpis: itensKpis, resumo: itensResumo, secoes: itensSecoes })
    setSalvando(false)
    if (r?.error) { setError(r.error); return }
    onSalvo()
    onClose()
  }

  async function restaurarPadrao() {
    setRestaurando(true); setError(null)
    const r = await restaurarDashboardPadrao(isGeral)
    setRestaurando(false)
    if (r?.error) { setError(r.error); return }
    onSalvo()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-4 text-white" />
            <p className="text-sm font-bold text-white">Personalizar Dashboard</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
          <p className="text-xs text-[#8C8880]">Ligue/desligue e reordene o que aparece no seu Dashboard. Vale pra todo mundo que acessa essa empresa.</p>

          <Lista titulo="Indicadores" itens={itensKpis} setItens={setItensKpis} />
          <Lista titulo="Resumo" itens={itensResumo} setItens={setItensResumo} />
          <Lista titulo="Seções" itens={itensSecoes} setItens={setItensSecoes} />

          <button type="button" onClick={restaurarPadrao} disabled={restaurando}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#8C8880] hover:text-[#1A56FF]">
            {restaurando ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />} Restaurar padrão do Orbi
          </button>
        </div>

        <div className="px-6 py-4 border-t border-[#EAE8E1] shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="flex-[2] h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  )
}
