'use client'

import { useState, useRef } from 'react'
import { updateContact } from '@/lib/actions/contacts'
import {
  X, Phone, Mail, Cake, DollarSign, Calendar, Clock,
  Edit2, Loader2, Check, MapPin
} from 'lucide-react'

type Contact = {
  id: string; name: string | null; phone: string; email: string | null
  data_nascimento: string | null; created_at: string
  cep?: string | null; endereco?: string | null; numero?: string | null
  bairro?: string | null; cidade?: string | null; uf?: string | null
}
type Stats = { totalGasto: number; numAgendamentos: number; numCompras: number }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtDate(s: string | null) {
  if (!s) return '—'
  const d = new Date(s.length <= 10 ? s + 'T12:00:00' : s)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ClienteDetalheModal({ contact, stats, onClose }: { contact: Contact; stats: Stats; onClose: () => void }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

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
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-[#2E2D29]"><Phone className="size-3.5 text-[#C8C5BB]" /> {contact.phone}</span>
              {contact.email && <span className="flex items-center gap-1.5 text-[#2E2D29]"><Mail className="size-3.5 text-[#C8C5BB]" /> {contact.email}</span>}
              {contact.data_nascimento && <span className="flex items-center gap-1.5 text-[#2E2D29]"><Cake className="size-3.5 text-[#C8C5BB]" /> {fmtDate(contact.data_nascimento)}</span>}
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

            <button onClick={() => setEditing(true)}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              <Edit2 className="size-4" /> Editar Cliente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
