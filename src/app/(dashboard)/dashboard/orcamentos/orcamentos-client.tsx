'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { NovoOrcamentoModal } from '@/components/orbi/novo-orcamento-modal'
import { updateOrcamentoStatus, converterEmOS, deleteOrcamento } from '@/lib/actions/orcamentos'
import {
  FileText, Plus, Search, Trash2, Loader2, Calendar, User,
  Check, X as XIcon, ArrowRight, MessageSquare, Clock
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; price: number }
type Product = { id: string; name: string; price: number }
type Item = { tipo: string; descricao: string; valor: number; qtd: number }
type Orcamento = {
  id: string; numero: number; contact_id: string | null
  cliente_nome: string | null; cliente_telefone: string | null; vendedor: string | null
  itens: Item[]; total: number; validade: string | null; status: string
  created_at: string; contacts: Contact | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string | null) {
  if (!s) return null
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  aberto:     { label: 'Aberto',     color: '#1A56FF', bg: '#EEF2FF' },
  aprovado:   { label: 'Aprovado',   color: '#0DB57A', bg: '#E6F9F3' },
  recusado:   { label: 'Recusado',   color: '#EF4444', bg: '#FEF2F2' },
  expirado:   { label: 'Expirado',   color: '#8C8880', bg: '#F1F0EC' },
  convertido: { label: 'Convertido em O.S.', color: '#8B5CF6', bg: '#F5F3FF' },
}

type Props = { orcamentos: Orcamento[]; contacts: Contact[]; services: Service[]; products: Product[]; vendedores: { id: string; nome: string }[] }

export function OrcamentosClient({ orcamentos, contacts, services, products, vendedores }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const filtered = orcamentos.filter(o =>
    !search || String(o.numero).includes(search) ||
    (o.contacts?.name ?? o.cliente_nome ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function setStatus(id: string, status: string) {
    setBusyId(id); await updateOrcamentoStatus(id, status); setBusyId(null)
  }
  async function converter(o: Orcamento) {
    setBusyId(o.id)
    const r = await converterEmOS(o.id)
    setBusyId(null)
    if (r?.error) setMsg(r.error)
    else if (r?.numeroOS) setMsg(`Orçamento convertido na O.S. #${r.numeroOS}!`)
    setTimeout(() => setMsg(null), 3000)
  }
  async function handleDelete(id: string) {
    setBusyId(id); await deleteOrcamento(id); setBusyId(null)
  }

  const aprovados = orcamentos.filter(o => o.status === 'aprovado').length
  const valorAberto = orcamentos.filter(o => o.status === 'aberto').reduce((s, o) => s + Number(o.total), 0)

  return (
    <>
      <div className="space-y-5">
        {msg && (
          <div className="bg-[#E6F9F3] border border-[#0DB57A]/20 text-[#0DB57A] text-sm font-medium rounded-xl px-4 py-3 flex items-center gap-2">
            <Check className="size-4" /> {msg}
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'TOTAL DE ORÇAMENTOS', value: String(orcamentos.length), color: '#1A56FF', bg: '#EEF2FF' },
            { label: 'APROVADOS', value: String(aprovados), color: '#0DB57A', bg: '#E6F9F3' },
            { label: 'EM ABERTO (R$)', value: fmt(valorAberto), color: '#F59E0B', bg: '#FEF3C7' },
          ].map(m => (
            <GlowCard key={m.label}><div className="p-5 flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow, sans-serif' }}>{m.label}</p>
              <p className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{m.value}</p></div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: m.bg }}><FileText className="size-5" style={{ color: m.color }} strokeWidth={1.5} /></div>
            </div></GlowCard>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nº ou cliente..."
              className="h-10 pl-9 pr-4 w-64 rounded-xl border border-[#EAE8E1] bg-white text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            <Plus className="size-4" /> Novo Orçamento
          </button>
        </div>

        {orcamentos.length === 0 ? (
          <GlowCard><div className="p-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center"><FileText className="size-7 text-[#1A56FF]" strokeWidth={1.5} /></div>
            <div className="text-center"><p className="text-base font-bold text-[#1C1B18]">Nenhum orçamento</p><p className="text-sm text-[#8C8880] mt-1">Faça orçamentos e envie por WhatsApp. Aprovou? Converte em O.S. num clique.</p></div>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}><Plus className="size-4" /> Criar primeiro orçamento</button>
          </div></GlowCard>
        ) : (
          <GlowCard><div className="divide-y divide-[#F7F6F3]">
            {filtered.map(o => {
              const st = STATUS[o.status] ?? STATUS.aberto
              const nome = o.contacts?.name ?? o.cliente_nome ?? o.cliente_telefone ?? '—'
              return (
                <div key={o.id} className="px-5 py-4 flex items-center justify-between hover:bg-[#F7F6F3] transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-center px-2 py-2 rounded-xl bg-[#0A0F1E]">
                      <p className="text-[9px] text-white/40 uppercase" style={{ fontFamily: 'Barlow, sans-serif' }}>ORÇ</p>
                      <p className="text-sm font-black text-white" style={{ fontFamily: 'Fraunces, serif' }}>#{o.numero}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1C1B18] flex items-center gap-1.5"><User className="size-3 text-[#C8C5BB]" />{nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[#C8C5BB]">{o.itens.length} {o.itens.length === 1 ? 'item' : 'itens'}</span>
                        {o.validade && <span className="flex items-center gap-1 text-xs text-[#8C8880]"><Clock className="size-3" />Válido até {fmtDate(o.validade)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(Number(o.total))}</span>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ fontFamily: 'Barlow, sans-serif', background: st.bg, color: st.color }}>{st.label}</span>

                    {/* Ações conforme status */}
                    {o.status === 'aberto' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setStatus(o.id, 'aprovado')} disabled={busyId === o.id} title="Aprovar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#0DB57A] hover:bg-[#E6F9F3]"><Check className="size-4" /></button>
                        <button onClick={() => setStatus(o.id, 'recusado')} disabled={busyId === o.id} title="Recusar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50"><XIcon className="size-4" /></button>
                      </div>
                    )}
                    {o.status === 'aprovado' && o.contact_id && (
                      <button onClick={() => converter(o)} disabled={busyId === o.id}
                        className="flex items-center gap-1 px-3 h-7 rounded-lg text-xs font-bold text-white" style={{ background: '#8B5CF6', fontFamily: 'Barlow, sans-serif' }}>
                        {busyId === o.id ? <Loader2 className="size-3 animate-spin" /> : <>Converter em O.S. <ArrowRight className="size-3" /></>}
                      </button>
                    )}
                    <button onClick={() => handleDelete(o.id)} disabled={busyId === o.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              )
            })}
          </div></GlowCard>
        )}
      </div>

      <NovoOrcamentoModal open={modalOpen} onClose={() => setModalOpen(false)} contacts={contacts} services={services} products={products} vendedores={vendedores} />
    </>
  )
}
