'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FUNIL_ETAPAS } from '@/lib/funil'
import { moverLead, criarLead } from '@/lib/actions/funil'
import { criarMsgPronta, excluirMsgPronta } from '@/lib/actions/crm'
import { deleteContact } from '@/lib/actions/contacts'
import { LeadDetalhe, type Lead } from '@/components/orbi/lead-detalhe'
import { Plus, X, Loader2, Check, Trash2, Zap, Star, ShoppingBag, CheckSquare, User } from 'lucide-react'

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function diasDesde(iso: string) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) }
function dataBR(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }

const STATUS_MAP: Record<string, { label: string; cor: string }> = {
  aberta: { label: 'Aberta', cor: '#1A56FF' },
  vendida: { label: 'Vendida', cor: '#0DB57A' },
  pendente: { label: 'Pendente', cor: '#F59E0B' },
  perdida: { label: 'Perdida', cor: '#EF4444' },
}

type Vendedor = { id: string; nome: string }
type MsgPronta = { id: string; titulo: string; texto: string }
type ProdLoja = { id: string; name: string; price: number }

export function FunilClient({ leads: leadsIniciais, vendedores = [], msgsProntas = [], produtosLoja = [], companyId = '' }: { leads: Lead[]; vendedores?: Vendedor[]; msgsProntas?: MsgPronta[]; produtosLoja?: ProdLoja[]; companyId?: string }) {
  const [leads, setLeads] = useState<Lead[]>(leadsIniciais)
  const router = useRouter()

  // mantém a lista em dia com o servidor (após router.refresh())
  useEffect(() => { setLeads(leadsIniciais) }, [leadsIniciais])

  // tempo real: novo lead/conversa chega → atualiza o painel sem precisar de F5
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!companyId) return
    const supabase = createClient()
    const agendarRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => router.refresh(), 600)
    }
    const channel = supabase.channel(`funil-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts', filter: `company_id=eq.${companyId}` }, agendarRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `company_id=eq.${companyId}` }, agendarRefresh)
      .subscribe()
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [companyId, router])
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Lead | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoFone, setNovoFone] = useState('')
  const [salvando, setSalvando] = useState(false)
  // mensagens prontas
  const [msgsOpen, setMsgsOpen] = useState(false)
  const [prontas, setProntas] = useState(msgsProntas)
  const [mpTit, setMpTit] = useState(''); const [mpTxt, setMpTxt] = useState('')

  async function addMsgPronta() {
    if (!mpTit.trim() || !mpTxt.trim()) return
    const r = await criarMsgPronta(mpTit, mpTxt)
    if (r?.msg) { setProntas(p => [...p, r.msg as MsgPronta]); setMpTit(''); setMpTxt('') }
  }
  async function delMsgPronta(id: string) { setProntas(p => p.filter(x => x.id !== id)); await excluirMsgPronta(id) }

  const vendMap = new Map(vendedores.map(v => [v.id, v.nome]))
  function leadsDe(k: string) {
    return leads
      .filter(l => (l.funil_etapa ?? 'novo') === k)
      .sort((a, b) => new Date(b.lastMessageAt ?? b.created_at).getTime() - new Date(a.lastMessageAt ?? a.created_at).getTime())
  }
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
        <div className="flex items-center gap-2">
          <button onClick={() => setMsgsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#F59E0B] bg-[#FEF3C7] hover:bg-[#FDE9A8]">
            <Zap className="size-4" /> Mensagens prontas
          </button>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            <Plus className="size-4" /> Novo Lead
          </button>
        </div>
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
                  const st = STATUS_MAP[lead.negociacao_status ?? 'aberta'] ?? STATUS_MAP.aberta
                  const nProd = lead.produtos?.length ?? 0
                  const totalProd = (lead.produtos ?? []).reduce((s, p) => s + (Number(p.quantidade) * Number(p.preco) - Number(p.desconto)), 0)
                  const ultAtiv = lead.lastMessageAt ?? lead.created_at
                  const dias = diasDesde(ultAtiv)
                  const esfriando = lead.negociacao_status === 'aberta' && dias >= 2
                  const resp = lead.responsavel_id ? vendMap.get(lead.responsavel_id) : null
                  return (
                    <div key={lead.id} draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setDetalhe(lead)}
                      className={`group bg-white rounded-xl p-2.5 cursor-pointer transition-all hover:shadow-lg border-l-[3px] ${dragId === lead.id ? 'opacity-40 scale-95' : 'shadow-sm'}`}
                      style={{ borderLeftColor: col.cor }}>
                      {/* status + esfriando */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: st.cor }}>
                          <span className="w-2 h-2 rounded-sm" style={{ background: st.cor }} /> {st.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {esfriando && <span className="text-[9px] font-semibold text-[#F59E0B]">❄ {dias}d</span>}
                          <button onClick={e => { e.stopPropagation(); excluir(lead.id) }}
                            className="text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-[#1C1B18] truncate leading-tight">{lead.name ?? lead.phone}</p>
                      {lead.origem && <p className="text-[11px] text-[#8C8880] truncate">{lead.origem}</p>}

                      {/* estrelas · responsável · produtos */}
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <span className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`size-2.5 ${n <= (lead.qualificacao ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-[#E5E2D9]'}`} strokeWidth={1} />)}
                        </span>
                        <span title={resp ?? 'Sem responsável'} className="flex items-center gap-0.5 text-[10px] text-[#8C8880]">
                          <User className="size-3" /> {resp ? resp.split(' ')[0] : '—'}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-[#8C8880] ml-auto">
                          <ShoppingBag className="size-3" /> {nProd > 0 ? fmt(totalProd) : 'Nenhum'}
                        </span>
                      </div>

                      {/* valor + criar tarefa */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F3F1EB]">
                        {Number(lead.funil_valor ?? 0) > 0
                          ? <span className="text-xs font-black text-[#0DB57A]">{fmt(Number(lead.funil_valor))}</span>
                          : <span className="text-[10px] text-[#C8C5BB]">sem valor</span>}
                        <button onClick={e => { e.stopPropagation(); setDetalhe(lead) }}
                          className="flex items-center gap-1 text-[10px] font-semibold text-[#1A56FF] hover:underline">
                          <CheckSquare className="size-3" /> Criar tarefa
                        </button>
                      </div>

                      {/* último contato */}
                      {lead.lastMessageAt && (
                        <div className="mt-2 text-[10px] text-[#8C8880] bg-[#FCE7F3]/40 rounded px-1.5 py-0.5">
                          Último contato {dataBR(lead.lastMessageAt)}
                        </div>
                      )}
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

      {detalhe && <LeadDetalhe lead={detalhe} onClose={() => setDetalhe(null)} onChange={aplicar} vendedores={vendedores} msgsProntas={msgsProntas} produtosLoja={produtosLoja} />}

      {/* Modal mensagens prontas */}
      {msgsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg,#0A0F1E,#F59E0B)' }}>
              <div className="flex items-center gap-2"><Zap className="size-5 text-white" /><p className="text-sm font-bold text-white">Mensagens prontas</p></div>
              <button onClick={() => setMsgsOpen(false)} className="text-white/50 hover:text-white"><X className="size-5" /></button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <p className="text-xs text-[#8C8880]">Crie respostas padrão para enviar com 1 clique no chat dos leads.</p>
              <div className="space-y-2">
                <input value={mpTit} onChange={e => setMpTit(e.target.value)} placeholder="Título (ex: Primeiro contato)"
                  className="w-full h-10 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#F59E0B]" />
                <textarea value={mpTxt} onChange={e => setMpTxt(e.target.value)} rows={3} placeholder="Texto da mensagem…"
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#F59E0B] resize-none" />
                <button onClick={addMsgPronta} disabled={!mpTit.trim() || !mpTxt.trim()}
                  className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: '#F59E0B' }}>
                  <Plus className="size-4" /> Adicionar mensagem
                </button>
              </div>
              <div className="space-y-2 pt-2 border-t border-[#F3F1EB]">
                {prontas.length === 0 ? <p className="text-xs text-[#C8C5BB] text-center py-3">Nenhuma mensagem ainda.</p>
                  : prontas.map(mp => (
                    <div key={mp.id} className="group bg-[#FAF9F6] rounded-lg p-2.5 border border-[#F0EFEA] flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="text-xs font-bold text-[#1C1B18]">{mp.titulo}</p><p className="text-[11px] text-[#8C8880]">{mp.texto}</p></div>
                      <button onClick={() => delMsgPronta(mp.id)} className="opacity-0 group-hover:opacity-100 text-red-400 shrink-0"><Trash2 className="size-3.5" /></button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
