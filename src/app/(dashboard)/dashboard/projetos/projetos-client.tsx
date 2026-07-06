'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { createProjeto, updateProjetoStatus, deleteProjeto } from '@/lib/actions/projetos'
import {
  Briefcase, Plus, Trash2, Loader2, X, Check, User, Calendar,
  ClipboardList, Play, Eye as EyeIcon, CheckCircle2, ArrowRight
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Vendedor = { id: string; nome: string }
type Projeto = {
  id: string; nome: string; responsavel: string | null; valor: number
  prazo: string | null; status: string; notas: string | null
  contacts: Contact | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string | null) {
  if (!s) return null
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function atrasado(s: string | null, status: string) {
  if (!s || status === 'concluido') return false
  return new Date(s + 'T23:59:59').getTime() < Date.now()
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Play }> = {
  planejamento: { label: 'Planejamento', color: '#1A56FF', bg: '#EEF2FF', icon: ClipboardList },
  andamento:    { label: 'Em Andamento', color: '#F59E0B', bg: '#FEF3C7', icon: Play },
  revisao:      { label: 'Revisão',      color: '#8B5CF6', bg: '#F5F3FF', icon: EyeIcon },
  concluido:    { label: 'Concluído',    color: '#0DB57A', bg: '#E6F9F3', icon: CheckCircle2 },
}
const KANBAN_COLS = ['planejamento', 'andamento', 'revisao', 'concluido']

export function ProjetosClient({ projetos, contacts, vendedores }: { projetos: Projeto[]; contacts: Contact[]; vendedores: Vendedor[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', contactId: '', responsavel: '', valor: '', prazo: '', notas: '' })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const r = await createProjeto({
      nome: form.nome, contactId: form.contactId || null, responsavel: form.responsavel,
      valor: parseFloat(form.valor.replace(',', '.')) || 0, prazo: form.prazo || null, notas: form.notas,
    })
    setLoading(false)
    if (r?.error) { setError(r.error); return }
    setModalOpen(false)
    setForm({ nome: '', contactId: '', responsavel: '', valor: '', prazo: '', notas: '' })
  }

  async function avancar(p: Projeto, status: string) {
    setBusyId(p.id)
    await updateProjetoStatus(p.id, status)
    setBusyId(null)
  }
  async function handleDelete(id: string) {
    setBusyId(id)
    await deleteProjeto(id)
    setBusyId(null)
  }

  const metrics = [
    { label: 'TOTAL', value: projetos.length, color: '#1A56FF', bg: '#EEF2FF' },
    { label: 'EM ANDAMENTO', value: projetos.filter(p => p.status === 'andamento').length, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'EM REVISÃO', value: projetos.filter(p => p.status === 'revisao').length, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'CONCLUÍDOS', value: projetos.filter(p => p.status === 'concluido').length, color: '#0DB57A', bg: '#E6F9F3' },
  ]

  const inputCls = "w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-[11px] font-bold text-[#2E2D29] uppercase tracking-wider block mb-1"

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
                  <Briefcase className="size-5" style={{ color: m.color }} strokeWidth={1.5} />
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <div className="flex items-center justify-end">
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            <Plus className="size-4" /> Novo Projeto
          </button>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-4 gap-4">
          {KANBAN_COLS.map(col => {
            const c = STATUS_CONFIG[col]
            const itens = projetos.filter(p => p.status === col)
            const nextStatus = KANBAN_COLS[KANBAN_COLS.indexOf(col) + 1]
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <c.icon className="size-4" style={{ color: c.color }} strokeWidth={1.5} />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif', color: c.color }}>{c.label}</p>
                  <span className="text-[10px] font-bold text-[#C8C5BB]">({itens.length})</span>
                </div>
                <div className="space-y-2.5">
                  {itens.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#EAE8E1] p-6 text-center text-xs text-[#C8C5BB]">Nenhum projeto</div>
                  ) : itens.map(p => {
                    const atraso = atrasado(p.prazo, p.status)
                    return (
                      <GlowCard key={p.id}>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-bold text-[#1C1B18] leading-snug">{p.nome}</p>
                            <button onClick={() => handleDelete(p.id)} disabled={busyId === p.id}
                              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                              {busyId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                            </button>
                          </div>
                          {p.contacts && <p className="text-xs text-[#8C8880] mb-1">{p.contacts.name ?? p.contacts.phone}</p>}
                          {p.responsavel && <p className="text-xs text-[#8C8880] flex items-center gap-1 mb-1"><User className="size-3" /> {p.responsavel}</p>}
                          <div className="flex items-center justify-between mt-2">
                            {p.prazo ? (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${atraso ? 'bg-red-50 text-red-500' : 'bg-[#F7F6F3] text-[#8C8880]'}`}>
                                <Calendar className="size-3" /> {fmtDate(p.prazo)}
                              </span>
                            ) : <span />}
                            {p.valor > 0 && <span className="text-xs font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(p.valor)}</span>}
                          </div>
                          {nextStatus && (
                            <button onClick={() => avancar(p, nextStatus)} disabled={busyId === p.id}
                              className="w-full mt-3 h-8 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors"
                              style={{ fontFamily: 'Barlow, sans-serif', background: c.bg, color: c.color }}>
                              {busyId === p.id ? <Loader2 className="size-3 animate-spin" /> : <>Mover para {STATUS_CONFIG[nextStatus].label} <ArrowRight className="size-3" /></>}
                            </button>
                          )}
                        </div>
                      </GlowCard>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal novo projeto */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><Briefcase className="size-4 text-white" strokeWidth={1.5} /></div>
                <p className="text-sm font-bold text-white">Novo Projeto</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div><label className={labelCls}>Nome do projeto *</label>
                <input value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Ex: Livro 'Caminhos' — 2ª edição" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Cliente</label>
                  <select value={form.contactId} onChange={e => set('contactId', e.target.value)} className={inputCls}>
                    <option value="">Nenhum</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name ?? c.phone}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Responsável</label>
                  <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} list="resp-list" placeholder="Nome" className={inputCls} />
                  <datalist id="resp-list">{vendedores.map(v => <option key={v.id} value={v.nome} />)}</datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Valor (R$)</label>
                  <input value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
                <div><label className={labelCls}>Prazo</label>
                  <input type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div><label className={labelCls}>Notas</label>
                <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3} placeholder="Observações do projeto..." className={`${inputCls} h-auto py-2.5 resize-none`} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Criar Projeto</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
