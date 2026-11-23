'use client'

// Etiquetas das conversas (as mesmas do Funil): chip colorido e janela para marcar/desmarcar e criar novas.
import { useEffect, useState } from 'react'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { etiquetasDaLoja } from '@/lib/actions/conversas'

const CORES = [
  { bg: '#EEF2FF', fg: '#1A56FF' }, { bg: '#E6F9F3', fg: '#0A8F60' }, { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#FCE7F3', fg: '#BE185D' }, { bg: '#F5F3FF', fg: '#7C3AED' }, { bg: '#FEE2E2', fg: '#B91C1C' },
  { bg: '#E0F2FE', fg: '#0369A1' }, { bg: '#ECFCCB', fg: '#4D7C0F' },
]

/** Cor fixa por nome: a mesma etiqueta tem sempre a mesma cor. */
export function corEtiqueta(nome: string) {
  let h = 0
  for (const ch of nome.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return CORES[h % CORES.length]
}

export function Etiqueta({ nome, pequena = false, ativa, onClick }: { nome: string; pequena?: boolean; ativa?: boolean; onClick?: () => void }) {
  const c = corEtiqueta(nome)
  const cls = `inline-flex items-center rounded-full font-semibold whitespace-nowrap ${pequena ? 'text-[10px] px-1.5 py-px' : 'text-xs px-2.5 py-1'} ${ativa ? 'ring-2 ring-offset-1' : ''}`
  const estilo = { background: c.bg, color: c.fg, ...(ativa ? { ['--tw-ring-color' as string]: c.fg } : {}) }
  return onClick
    ? <button onClick={onClick} className={cls} style={estilo}>{nome}</button>
    : <span className={cls} style={estilo}>{nome}</span>
}

export function JanelaEtiquetas({ atuais, nome, onFechar, onSalvar }: {
  atuais: string[]; nome: string; onFechar: () => void; onSalvar: (tags: string[]) => Promise<string | null>
}) {
  const [todas, setTodas] = useState<string[] | null>(null)
  const [sel, setSel] = useState<string[]>(atuais)
  const [nova, setNova] = useState('')
  const [ocupado, setOcupado] = useState(false), [erro, setErro] = useState<string | null>(null)
  useEffect(() => { etiquetasDaLoja().then(l => setTodas([...new Set([...l, ...atuais])])).catch(() => setTodas(atuais)) }, [atuais])

  function criar() {
    const t = nova.trim().slice(0, 40)
    if (!t) return
    setTodas(l => [...new Set([...(l ?? []), t])])
    setSel(l => l.includes(t) ? l : [...l, t])
    setNova('')
  }
  async function salvar() {
    setOcupado(true); setErro(null)
    const e = await onSalvar(sel)
    setOcupado(false)
    if (e) setErro(e); else onFechar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4" style={{ background: 'rgba(10,15,30,0.55)' }} onClick={onFechar}>
      <div className="w-full md:max-w-sm bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-[#EAE8E1] flex items-center justify-between">
          <p className="text-sm font-bold text-[#1C1B18] truncate">Etiquetas — {nome}</p>
          <button onClick={onFechar} aria-label="Fechar" className="text-[#8C8880] hover:text-[#1C1B18]"><X className="size-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {todas === null ? (
            <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-[#1A56FF]" /></div>
          ) : (
            <div className="space-y-1.5">
              {todas.length === 0 && <p className="text-xs text-[#8C8880]">Nenhuma etiqueta ainda. Crie a primeira abaixo (ex: Orçamento enviado, Cliente VIP, Retorno).</p>}
              {todas.map(t => {
                const marcada = sel.includes(t)
                return (
                  <button key={t} onClick={() => setSel(l => marcada ? l.filter(x => x !== t) : [...l, t])}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F7F6F3]">
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${marcada ? 'bg-[#1A56FF] border-[#1A56FF]' : 'border-[#C8C5BB]'}`}>{marcada && <Check className="size-3.5 text-white" />}</span>
                    <Etiqueta nome={t} />
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input value={nova} onChange={e => setNova(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); criar() } }}
              placeholder="Nova etiqueta" className="flex-1 h-10 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" />
            <button onClick={criar} disabled={!nova.trim()} aria-label="Criar etiqueta" className="w-10 rounded-lg border border-[#EAE8E1] flex items-center justify-center text-[#1A56FF] disabled:opacity-40"><Plus className="size-4" /></button>
          </div>
          <p className="text-[11px] text-[#8C8880]">As etiquetas ficam no contato e aparecem também no Funil.</p>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <button onClick={salvar} disabled={ocupado} className="w-full h-11 rounded-xl bg-[#1A56FF] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {ocupado && <Loader2 className="size-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
