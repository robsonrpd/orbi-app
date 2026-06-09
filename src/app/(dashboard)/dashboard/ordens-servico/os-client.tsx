'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { NovaOSModal } from '@/components/orbi/nova-os-modal'
import { updateOSStatus, deleteOS } from '@/lib/actions/ordens-servico'
import {
  FileText, Plus, Search, List, LayoutGrid, Trash2, Loader2,
  Building2, Calendar, ChevronRight, Stethoscope, Clock,
  Send, CheckCircle2, PackageCheck, Ban
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; price: number }
type Product = { id: string; name: string; price: number }
type OSItem = { tipo: string; descricao: string; valor: number; qtd: number }
type OS = {
  id: string; numero: number; status: string; vendedor: string | null
  medico: string | null; laboratorio: string | null
  data_emissao: string; data_prevista_cliente: string | null
  itens: OSItem[]; total: number; sinal: number
  garantia: boolean; observacoes: string | null
  contacts: Contact | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Send }> = {
  emitida:     { label: 'Emitida',      color: '#1A56FF', bg: '#EEF2FF', icon: FileText },
  laboratorio: { label: 'No Laboratório', color: '#F59E0B', bg: '#FEF3C7', icon: Send },
  pronta:      { label: 'Pronta',       color: '#8B5CF6', bg: '#F5F3FF', icon: PackageCheck },
  entregue:    { label: 'Entregue',     color: '#0DB57A', bg: '#E6F9F3', icon: CheckCircle2 },
  cancelada:   { label: 'Cancelada',    color: '#EF4444', bg: '#FEF2F2', icon: Ban },
}

const KANBAN_COLS = ['emitida', 'laboratorio', 'pronta', 'entregue']

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.emitida
  const Icon = c.icon
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
      style={{ fontFamily: 'Barlow, sans-serif', background: c.bg, color: c.color }}>
      <Icon className="size-3" strokeWidth={2} /> {c.label}
    </span>
  )
}

type Props = { ordens: OS[]; contacts: Contact[]; services: Service[]; products: Product[] }

export function OSClient({ ordens, contacts, services, products }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = ordens.filter(o =>
    !search ||
    String(o.numero).includes(search) ||
    (o.contacts?.name ?? o.contacts?.phone ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function advanceStatus(o: OS, status: string) {
    setBusyId(o.id)
    await updateOSStatus(o.id, status)
    setBusyId(null)
  }
  async function handleDelete(id: string) {
    setBusyId(id)
    await deleteOS(id)
    setBusyId(null)
  }

  const metrics = [
    { label: 'TOTAL', value: ordens.length, color: '#1A56FF', bg: '#EEF2FF' },
    { label: 'NO LABORATÓRIO', value: ordens.filter(o => o.status === 'laboratorio').length, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'PRONTAS', value: ordens.filter(o => o.status === 'pronta').length, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'ENTREGUES', value: ordens.filter(o => o.status === 'entregue').length, color: '#0DB57A', bg: '#E6F9F3' },
  ]

  return (
    <>
      <div className="space-y-5">
        {/* Métricas */}
        <div className="grid grid-cols-4 gap-4">
          {metrics.map(m => (
            <GlowCard key={m.label}>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow, sans-serif' }}>{m.label}</p>
                  <p className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{m.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: m.bg }}>
                  <FileText className="size-5" style={{ color: m.color }} strokeWidth={1.5} />
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        {/* Barra de ações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-[#EAE8E1] rounded-xl p-1">
              <button onClick={() => setView('lista')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'lista' ? 'bg-[#1A56FF] text-white' : 'text-[#8C8880]'}`}
                style={{ fontFamily: 'Barlow, sans-serif' }}>
                <List className="size-3.5" /> Lista
              </button>
              <button onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'kanban' ? 'bg-[#1A56FF] text-white' : 'text-[#8C8880]'}`}
                style={{ fontFamily: 'Barlow, sans-serif' }}>
                <LayoutGrid className="size-3.5" /> Monitor de Produção
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nº ou cliente..."
                className="h-9 pl-9 pr-4 w-56 rounded-xl border border-[#EAE8E1] bg-white text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
            </div>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            <Plus className="size-4" /> Nova O.S.
          </button>
        </div>

        {/* Empty */}
        {ordens.length === 0 ? (
          <GlowCard>
            <div className="p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <FileText className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#1C1B18]">Nenhuma ordem de serviço</p>
                <p className="text-sm text-[#8C8880] mt-1">Crie a primeira O.S. de um pedido de óculos.</p>
              </div>
              <button onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                <Plus className="size-4" /> Criar primeira O.S.
              </button>
            </div>
          </GlowCard>
        ) : view === 'lista' ? (
          /* LISTA */
          <GlowCard>
            <div className="divide-y divide-[#F7F6F3]">
              {filtered.map(o => (
                <div key={o.id} className="px-5 py-4 flex items-center justify-between hover:bg-[#F7F6F3] transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-center px-2 py-2 rounded-xl bg-[#0A0F1E]">
                      <p className="text-[9px] text-white/40 uppercase" style={{ fontFamily: 'Barlow, sans-serif' }}>O.S.</p>
                      <p className="text-sm font-black text-white" style={{ fontFamily: 'Fraunces, serif' }}>#{o.numero}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1C1B18]">{o.contacts?.name ?? o.contacts?.phone ?? '—'}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {o.laboratorio && <span className="flex items-center gap-1 text-xs text-[#8C8880]"><Building2 className="size-3" />{o.laboratorio}</span>}
                        {o.data_prevista_cliente && <span className="flex items-center gap-1 text-xs text-[#8C8880]"><Calendar className="size-3" />Entrega {fmtDate(o.data_prevista_cliente)}</span>}
                        <span className="text-xs text-[#C8C5BB]">{o.itens.length} {o.itens.length === 1 ? 'item' : 'itens'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(Number(o.total))}</p>
                      {Number(o.sinal) > 0 && <p className="text-[10px] text-[#F59E0B]">Sinal {fmt(Number(o.sinal))}</p>}
                    </div>
                    <StatusBadge status={o.status} />
                    <button onClick={() => handleDelete(o.id)} disabled={busyId === o.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      {busyId === o.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        ) : (
          /* KANBAN — Monitor de Produção */
          <div className="grid grid-cols-4 gap-4">
            {KANBAN_COLS.map(col => {
              const c = STATUS_CONFIG[col]
              const colItems = filtered.filter(o => o.status === col)
              const nextStatus = KANBAN_COLS[KANBAN_COLS.indexOf(col) + 1]
              return (
                <div key={col} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif', color: c.color }}>
                      <c.icon className="size-3.5" /> {c.label}
                    </span>
                    <span className="text-xs font-bold text-[#C8C5BB]">{colItems.length}</span>
                  </div>
                  <div className="space-y-2 min-h-24">
                    {colItems.map(o => (
                      <div key={o.id} className="bg-white rounded-xl border border-[#EAE8E1] p-3 hover:shadow-sm transition-shadow"
                        style={{ borderTop: `3px solid ${c.color}` }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>#{o.numero}</span>
                          <span className="text-xs font-bold text-[#1A56FF]">{fmt(Number(o.total))}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#1C1B18] truncate">{o.contacts?.name ?? o.contacts?.phone ?? '—'}</p>
                        {o.data_prevista_cliente && (
                          <p className="text-[10px] text-[#8C8880] flex items-center gap-1 mt-1">
                            <Clock className="size-2.5" /> Entrega {fmtDate(o.data_prevista_cliente)}
                          </p>
                        )}
                        {nextStatus && (
                          <button onClick={() => advanceStatus(o, nextStatus)} disabled={busyId === o.id}
                            className="mt-2 w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-all hover:opacity-90"
                            style={{ fontFamily: 'Barlow, sans-serif', background: STATUS_CONFIG[nextStatus].bg, color: STATUS_CONFIG[nextStatus].color }}>
                            {busyId === o.id ? <Loader2 className="size-3 animate-spin" /> : <>Avançar → {STATUS_CONFIG[nextStatus].label}</>}
                          </button>
                        )}
                      </div>
                    ))}
                    {colItems.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-[#EAE8E1] py-6 text-center">
                        <p className="text-[10px] text-[#C8C5BB]">Vazio</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <NovaOSModal open={modalOpen} onClose={() => setModalOpen(false)}
        contacts={contacts} services={services} products={products} />
    </>
  )
}
