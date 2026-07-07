'use client'

import { useState, useRef } from 'react'
import { updateContact, deleteContact } from '@/lib/actions/contacts'
import {
  X, Phone, Mail, Cake, Clock,
  Edit2, Loader2, Check, MapPin, Trash2, AlertCircle, CreditCard, ShoppingBag, MessageCircle
} from 'lucide-react'

function waLink(phone: string) {
  const d = (phone || '').replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}`
}

type Contact = {
  id: string; name: string | null; phone: string; email: string | null
  data_nascimento: string | null; created_at: string; origem?: string | null
  cep?: string | null; endereco?: string | null; numero?: string | null
  bairro?: string | null; cidade?: string | null; uf?: string | null
}
type Stats = {
  totalGasto: number; numAgendamentos: number; numCompras: number
  devendo?: number; formas?: Record<string, number>; produtos?: string[]
}

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtDate(s: string | null) {
  if (!s) return '—'
  const d = new Date(s.length <= 10 ? s + 'T12:00:00' : s)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ClienteDetalheModal({ contact, stats, onClose }: { contact: Contact; stats: Stats; onClose: () => void }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleDelete() {
    setDeleting(true); setError(null)
    const result = await deleteContact(contact.id)
    setDeleting(false)
    if (result?.error) { setError(result.error); setConfirmDel(false); return }
    onClose()
  }

  const diasCliente = Math.max(0, Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24)))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const fd = new FormData(formRef.current!)
    const result = await updateContact(contact.id, fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    onClose()
  }

  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE8E1]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#EEF2FF] flex items-center justify-center text-base font-bold text-[#1A56FF]">
              {(contact.name ?? contact.phone)[0].toUpperCase()}
            </div>
            <div>
              <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{contact.name ?? 'Sem nome'}</p>
              <p className="text-xs text-[#8C8880] flex items-center gap-1"><Clock className="size-3" /> Cliente há {diasCliente} dias</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3]"><X className="size-5" /></button>
        </div>

        {editing ? (
          /* MODO EDIÇÃO */
          <form ref={formRef} onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Nome</label><input name="name" defaultValue={contact.name ?? ''} className={inputCls} /></div>
              <div><label className={labelCls}>WhatsApp *</label><input name="phone" required defaultValue={contact.phone} className={inputCls} /></div>
              <div><label className={labelCls}>E-mail</label><input name="email" type="email" defaultValue={contact.email ?? ''} className={inputCls} /></div>
              <div><label className={labelCls}>Nascimento</label><input name="data_nascimento" type="date" defaultValue={contact.data_nascimento?.split('T')[0] ?? ''} className={inputCls} /></div>
              <div className="col-span-2">
                <label className={labelCls}>Origem (como nos conheceu)</label>
                <select name="origem" defaultValue={contact.origem ?? ''} className={inputCls}>
                  <option value="">Não informado</option>
                  {['Instagram','Facebook','Google','Indicação de amigo','Indicação médica','Passou em frente','Já era cliente','WhatsApp','Outro'].map(o =>
                    <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {/* preserva endereço/lgpd existentes */}
            <input type="hidden" name="cep" defaultValue={contact.cep ?? ''} />
            <input type="hidden" name="endereco" defaultValue={contact.endereco ?? ''} />
            <input type="hidden" name="numero" defaultValue={contact.numero ?? ''} />
            <input type="hidden" name="bairro" defaultValue={contact.bairro ?? ''} />
            <input type="hidden" name="cidade" defaultValue={contact.cidade ?? ''} />
            <input type="hidden" name="uf" defaultValue={contact.uf ?? ''} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar</>}
              </button>
            </div>
          </form>
        ) : (
          /* MODO VISUALIZAÇÃO */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Contato */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-[#2E2D29]"><Phone className="size-3.5 text-[#C8C5BB]" /> {contact.phone}</span>
              {contact.email && <span className="flex items-center gap-1.5 text-[#2E2D29]"><Mail className="size-3.5 text-[#C8C5BB]" /> {contact.email}</span>}
              {contact.data_nascimento && <span className="flex items-center gap-1.5 text-[#2E2D29]"><Cake className="size-3.5 text-[#C8C5BB]" /> {fmtDate(contact.data_nascimento)}</span>}
            </div>

            {/* Origem + status financeiro */}
            <div className="flex flex-wrap items-center gap-2">
              {contact.origem && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#1A56FF] font-semibold">
                  <MapPin className="size-3" /> Veio por: {contact.origem}
                </span>
              )}
              {(stats.devendo ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-500 font-bold">
                  <AlertCircle className="size-3" /> Devendo {fmt(stats.devendo ?? 0)}
                </span>
              ) : stats.numCompras > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#E6F9F3] text-[#0DB57A] font-bold">
                  <Check className="size-3" /> Em dia
                </span>
              ) : null}
              {stats.formas && Object.keys(stats.formas).length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#F7F6F3] text-[#8C8880] font-semibold">
                  <CreditCard className="size-3" /> Paga via {Object.entries(stats.formas).sort((a, b) => b[1] - a[1])[0][0]}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#F7F6F3] p-3 text-center">
                <p className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{stats.numAgendamentos}</p>
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mt-0.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Agendamentos</p>
              </div>
              <div className="rounded-xl bg-[#E6F9F3] p-3 text-center">
                <p className="text-xl font-black text-[#0DB57A]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(stats.totalGasto)}</p>
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mt-0.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Total Gasto</p>
              </div>
              <div className="rounded-xl bg-[#EEF2FF] p-3 text-center">
                <p className="text-xl font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>{stats.numCompras}</p>
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mt-0.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Compras</p>
              </div>
            </div>

            {/* Produtos comprados */}
            {(stats.produtos?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ fontFamily: 'Barlow, sans-serif' }}>
                  <ShoppingBag className="size-3" /> Produtos que já comprou
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.produtos!.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-[#F7F6F3] text-[#2E2D29] border border-[#EAE8E1]">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Endereço */}
            {(contact.endereco || contact.cidade) && (
              <div className="rounded-xl border border-[#EAE8E1] p-3 flex items-start gap-2">
                <MapPin className="size-4 text-[#8C8880] mt-0.5 shrink-0" />
                <p className="text-sm text-[#2E2D29]">
                  {[contact.endereco, contact.numero, contact.bairro].filter(Boolean).join(', ')}
                  {contact.cidade && <span className="text-[#8C8880]"> — {contact.cidade}{contact.uf ? `/${contact.uf}` : ''}</span>}
                </p>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

            <div className="flex gap-3">
              <a href={waLink(contact.phone)} target="_blank" rel="noopener noreferrer"
                className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ fontFamily: 'Barlow, sans-serif', background: '#0DB57A', boxShadow: '0 4px 16px rgba(13,181,122,0.35)' }}>
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <button onClick={() => setEditing(true)}
                className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                <Edit2 className="size-4" /> Editar Cliente
              </button>
              {confirmDel ? (
                <button onClick={handleDelete} disabled={deleting}
                  className="px-4 h-11 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Confirmar</>}
                </button>
              ) : (
                <button onClick={() => setConfirmDel(true)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-red-500 border border-[#EAE8E1] hover:bg-red-50 transition-colors">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            {confirmDel && <p className="text-xs text-red-500 text-center">Clique em Confirmar para excluir definitivamente este cliente.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
