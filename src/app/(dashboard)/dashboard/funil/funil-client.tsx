'use client'

import { useState } from 'react'
import { FUNIL_ETAPAS } from '@/lib/funil'
import { moverLead, criarLead } from '@/lib/actions/funil'
import { deleteContact } from '@/lib/actions/contacts'
import { LeadDetalhe, type Lead } from '@/components/orbi/lead-detalhe'
import { Plus, X, Loader2, Check, Trash2 } from 'lucide-react'

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function tempo(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias <= 0) return 'hoje'; if (dias === 1) return 'ontem'; return `${dias}d`
}

export function FunilClient({ leads: leadsIniciais }: { leads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(leadsIniciais)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Lead | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoFone, setNovoFone] = useState('')
  const [salvando, setSalvando] = useState(false)

  function leadsDe(k: string) { return leads.filter(l => (l.funil_etapa ?? 'novo') === k) }
  function totalDe(k: string) { return leadsDe(k).reduce((s, l) => s + Number(l.funil_valor ?? 0), 0) }

  async function soltar(etapa: string) {
    setOverCol(null)
    const id = dragId; setDragId(null)
    if (!id) return
    const lead = leads.find(l => l.id === id)
    if (!lead || (lead.funil_etapa ?? 'novo') === etapa) return
    setLeads(ls => ls.map(l => l.id === id ? { ...l, funil_etapa: etapa } : l))
    await moverLead(id, etapa)
  }

  function aplicar(id: string, patch: Partial<Lead>) {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
    setDetalhe(d => d && d.id === id ? { ...d, ...patch } : d)
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoFone.trim()) return
    setSalvando(true)
    const r = await criarLead(novoNome, novoFone)
    setSalvando(false)
    if (r?.error) return
    window.location.reload()
  }

  async function excluir(id: string) {
    setLeads(ls => ls.filter(l => l.id !== id))
    await deleteContact(id)
  }

  const totalAberto = leads.filter(l => l.funil_etapa !== 'perdido' && l.funil_etapa !== 'convertido').reduce((s, l) => s + Number(l.funil_valor ?? 0), 0)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <p className="text-sm text-[#8C8880]">
          {leads.length} leads · <strong className="text-[#1A56FF]">{fmt(totalAberto)}</strong> em aberto · clique num card para abrir a conversa
        </p>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
          <Plus className="size-4" /> Novo Lead
        </button>
      </div>

      <div className="flex-1 flex gap-3 overflow-x-auto pb-2">
        {FUNIL_ETAPAS.map(col => {
          const items = leadsDe(col.key)
          const total = totalDe(col.key)
          return (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); setOverCol(col.key) }}
              onDragLeave={() => setOverCol(c => c === col.key ? null : c)}
              onDrop={() => soltar(col.key)}
              className="shrink-0 w-[284px] flex flex-col rounded-2xl border bg-[#FAFAF9] transition-all"
              style={overCol === col.key ? { borderColor: col.cor, boxShadow: `0 0 0 3px ${col.cor}22`, background: '#fff' } : { borderColor: '#EDEBE4' }}>
              <div className="px-3.5 py-3 rounded-t-2xl" style={{ background: col.bg }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.cor }} />
                    <span className="text-[13px] font-black" style={{ color: col.cor, fontFamily: 'Fraunces, serif' }}>{col.label}</span>
                  </div>
                  <span className="text-[11px] font-black text-white rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center" style={{ background: col.cor }}>{items.length}</span>
                </div>
                {total > 0 && <p className="text-[12px] font-bold mt-1" style={{ color: col.cor }}>{fmt(total)}</p>}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
                {items.map(lead => {
                  const ultima = lead.messages?.[lead.messages.length - 1]
                  return (
                    <div key={lead.id} draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setDetalhe(lead)}
                      className={`group bg-white rounded-xl p-3 cursor-pointer transition-all hover:shadow-lg border-l-[3px] ${dragId === lead.id ? 'opacity-40 scale-95' : 'shadow-sm'}`}
                      style={{ borderLeftColor: col.cor }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: col.cor }}>
                          {(lead.name ?? lead.phone)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#1C1B18] truncate leading-tight">{lead.name ?? 'Sem nome'}</p>
                          <p className="text-[11px] text-[#8C8880] truncate">{ultima ? `${ultima.role !== 'user' ? '➜ ' : ''}${ultima.content}` : lead.phone}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); excluir(lead.id) }}
                          className="w-6 h-6 flex items-center justify-center rounded text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 shrink-0"><Trash2 className="size-3.5" /></button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {Number(lead.funil_valor ?? 0) > 0
                          ? <span className="text-xs font-black text-[#0DB57A]">{fmt(Number(lead.funil_valor))}</span>
                          : <span />}
                        <div className="flex items-center gap-1.5">
                          {(lead.tags ?? []).slice(0, 1).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#1A56FF]">{t}</span>)}
                          {lead.origem && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#8C8880]">{lead.origem}</span>}
                          <span className="text-[10px] text-[#C8C5BB]">{tempo(lead.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div className="text-center text-[11px] text-[#C8C5BB] py-8 border-2 border-dashed rounded-xl" style={{ borderColor: '#E8E5DC' }}>Solte um lead aqui</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {detalhe && <LeadDetalhe lead={detalhe} onClose={() => setDetalhe(null)} onChange={aplicar} />}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
              <p className="text-sm font-bold text-white">Novo Lead</p>
              <button onClick={() => setAddOpen(false)} className="text-white/50 hover:text-white"><X className="size-5" /></button>
            </div>
            <form onSubmit={adicionar} className="p-6 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider block mb-1">Nome</label>
                <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome do lead"
                  className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider block mb-1">WhatsApp *</label>
                <input value={novoFone} onChange={e => setNovoFone(e.target.value)} required placeholder="85 99999-9999"
                  className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" />
              </div>
              <button type="submit" disabled={salvando}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
                {salvando ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Adicionar</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
