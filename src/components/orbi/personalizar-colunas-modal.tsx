'use client'

import { useState } from 'react'
import { salvarColunasFunil, restaurarColunasFunilPadrao } from '@/lib/actions/funil-colunas'
import { PALETA_CORES_FUNIL, FUNIL_ETAPAS, type FunilColuna } from '@/lib/funil'
import { X, Plus, Trash2, ChevronUp, ChevronDown, Check, Loader2, RotateCcw, Palette } from 'lucide-react'

type Props = { open: boolean; colunas: FunilColuna[]; onClose: () => void; onSalvo: (novas: FunilColuna[]) => void }

export function PersonalizarColunasModal({ open, colunas, onClose, onSalvo }: Props) {
  const [itens, setItens] = useState<FunilColuna[]>(colunas)
  const [paletaAberta, setPaletaAberta] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [restaurando, setRestaurando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function renomear(i: number, label: string) {
    setItens(prev => prev.map((c, idx) => idx === i ? { ...c, label } : c))
  }
  function recolorir(i: number, cor: string, bg: string) {
    setItens(prev => prev.map((c, idx) => idx === i ? { ...c, cor, bg } : c))
    setPaletaAberta(null)
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
  function remover(i: number) {
    setItens(prev => prev.filter((_, idx) => idx !== i))
  }
  function adicionar() {
    const existentes = itens.map(c => c.key)
    const cor = PALETA_CORES_FUNIL[itens.length % PALETA_CORES_FUNIL.length]
    const label = 'Nova coluna'
    setItens(prev => [...prev, { key: gerarKeyColunaLocal(label, existentes), label, cor: cor.cor, bg: cor.bg }])
  }
  // gera a key no cliente (só pra novas colunas ainda não salvas) — o servidor confia nisso na hora de salvar
  function gerarKeyColunaLocal(label: string, existentes: string[]) {
    const base = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'coluna'
    if (!existentes.includes(base)) return base
    let i = 2
    while (existentes.includes(`${base}-${i}`)) i++
    return `${base}-${i}`
  }

  async function salvar() {
    setSalvando(true); setError(null)
    const r = await salvarColunasFunil(itens)
    setSalvando(false)
    if (r?.error) { setError(r.error); return }
    onSalvo(itens)
    onClose()
  }

  async function restaurarPadrao() {
    setRestaurando(true); setError(null)
    const r = await restaurarColunasFunilPadrao()
    setRestaurando(false)
    if (r?.error) { setError(r.error); return }
    onSalvo(FUNIL_ETAPAS)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-white" />
            <p className="text-sm font-bold text-white">Personalizar colunas do funil</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
          <p className="text-xs text-[#8C8880]">Renomeie, recolorir, reordene, adicione ou remova colunas. Não dá pra excluir uma coluna que ainda tem leads dentro.</p>

          {itens.map((c, i) => (
            <div key={c.key} className="flex items-center gap-2">
              <div className="relative shrink-0">
                <button type="button" onClick={() => setPaletaAberta(p => p === i ? null : i)}
                  className="w-9 h-9 rounded-lg border border-[#EAE8E1]" style={{ background: c.bg }}>
                  <span className="block w-3 h-3 rounded-full mx-auto" style={{ background: c.cor }} />
                </button>
                {paletaAberta === i && (
                  <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded-xl shadow-xl border border-[#EAE8E1] p-2 grid grid-cols-5 gap-1.5 w-[168px]">
                    {PALETA_CORES_FUNIL.map(p => (
                      <button key={p.cor} type="button" onClick={() => recolorir(i, p.cor, p.bg)}
                        className="w-6 h-6 rounded-full border border-black/5" style={{ background: p.cor }} />
                    ))}
                  </div>
                )}
              </div>
              <input value={c.label} onChange={e => renomear(i, e.target.value)} maxLength={40}
                className="flex-1 h-9 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" />
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
                <button type="button" onClick={() => remover(i)} disabled={itens.length <= 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-30"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}

          <button type="button" onClick={adicionar} disabled={itens.length >= 12}
            className="w-full h-10 rounded-xl border-2 border-dashed border-[#EAE8E1] flex items-center justify-center gap-1.5 text-sm font-semibold text-[#8C8880] hover:border-[#1A56FF] hover:text-[#1A56FF] transition-colors disabled:opacity-40">
            <Plus className="size-4" /> Nova coluna
          </button>

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
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar colunas</>}
          </button>
        </div>
      </div>
    </div>
  )
}
