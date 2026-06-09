'use client'

import { useState, useRef } from 'react'
import { createReceita } from '@/lib/actions/receitas'
import { X, Eye, Loader2, Check, Glasses, Stethoscope, Calendar } from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }

type Props = {
  open: boolean
  onClose: () => void
  contacts: Contact[]
  preselectedContact?: Contact | null
}

// Campos da grade óptica
const COLS = [
  { key: 'esferico', label: 'Esférico', ph: '-2.00' },
  { key: 'cilindrico', label: 'Cilíndrico', ph: '-0.50' },
  { key: 'eixo', label: 'Eixo', ph: '180' },
  { key: 'dnp', label: 'DNP', ph: '32' },
  { key: 'altura', label: 'Altura', ph: '20' },
]

export function NovaReceitaModal({ open, onClose, contacts, preselectedContact }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState(preselectedContact ? (preselectedContact.name ?? preselectedContact.phone) : '')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(preselectedContact ?? null)
  const [showContacts, setShowContacts] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const filtered = contacts.filter(c =>
    contactSearch.length > 0 && !selectedContact &&
    (c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
  ).slice(0, 5)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedContact) { setError('Selecione um cliente.'); return }
    setLoading(true); setError(null)
    const fd = new FormData(formRef.current!)
    fd.set('contact_id', selectedContact.id)
    const result = await createReceita(fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    formRef.current?.reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Eye className="size-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Nova Receita (RX)</p>
              <p className="text-xs text-white/50">Registre as medidas ópticas do cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Cliente / Médico / Data */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1" style={{ fontFamily: 'Barlow, sans-serif' }}>
                <Eye className="size-3" /> Cliente <span className="text-red-400">*</span>
              </label>
              <input value={contactSearch}
                onChange={e => { setContactSearch(e.target.value); setSelectedContact(null); setShowContacts(true) }}
                onFocus={() => setShowContacts(true)}
                placeholder="Buscar cliente..."
                className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
              {showContacts && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#EAE8E1] rounded-xl shadow-lg overflow-hidden">
                  {filtered.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setSelectedContact(c); setContactSearch(c.name ?? c.phone); setShowContacts(false) }}
                      className="w-full text-left px-3 py-2 hover:bg-[#F7F6F3] transition-colors border-b border-[#EAE8E1] last:border-0">
                      <p className="text-sm font-medium text-[#1C1B18]">{c.name ?? 'Sem nome'}</p>
                      <p className="text-xs text-[#8C8880]">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1" style={{ fontFamily: 'Barlow, sans-serif' }}>
                <Stethoscope className="size-3" /> Médico
              </label>
              <input name="medico" placeholder="Dr(a)..."
                className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1" style={{ fontFamily: 'Barlow, sans-serif' }}>
                <Calendar className="size-3" /> Data
              </label>
              <input type="date" name="data_receita" defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all" />
            </div>
          </div>

          {/* Grade óptica */}
          <div className="rounded-xl border border-[#EAE8E1] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#0A0F1E] flex items-center gap-2">
              <Glasses className="size-4 text-[#93AAFF]" strokeWidth={1.5} />
              <span className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                Medidas Ópticas
              </span>
            </div>

            {/* Cabeçalho de colunas */}
            <div className="grid grid-cols-6 bg-[#F7F6F3] border-b border-[#EAE8E1]">
              <div className="px-3 py-2.5 text-[10px] font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Olho</div>
              {COLS.map(c => (
                <div key={c.key} className="px-2 py-2.5 text-[10px] font-bold text-[#8C8880] uppercase tracking-wider text-center" style={{ fontFamily: 'Barlow, sans-serif' }}>
                  {c.label}
                </div>
              ))}
            </div>

            {/* Linha OD */}
            <div className="grid grid-cols-6 border-b border-[#EAE8E1] items-center">
              <div className="px-3 py-2.5">
                <span className="inline-flex items-center justify-center w-12 h-7 rounded-lg bg-[#EEF2FF] text-xs font-black text-[#1A56FF]" style={{ fontFamily: 'Barlow, sans-serif' }}>
                  OD
                </span>
                <p className="text-[9px] text-[#C8C5BB] mt-0.5 ml-0.5">Direito</p>
              </div>
              {COLS.map(c => (
                <div key={c.key} className="px-1.5 py-2">
                  <input name={`od_${c.key}`} placeholder={c.ph}
                    className="w-full h-9 px-2 rounded-lg border border-[#EAE8E1] bg-white text-sm text-center text-[#1C1B18] outline-none focus:border-[#1A56FF] focus:ring-2 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]" />
                </div>
              ))}
            </div>

            {/* Linha OE */}
            <div className="grid grid-cols-6 items-center">
              <div className="px-3 py-2.5">
                <span className="inline-flex items-center justify-center w-12 h-7 rounded-lg bg-[#F5F3FF] text-xs font-black text-[#8B5CF6]" style={{ fontFamily: 'Barlow, sans-serif' }}>
                  OE
                </span>
                <p className="text-[9px] text-[#C8C5BB] mt-0.5 ml-0.5">Esquerdo</p>
              </div>
              {COLS.map(c => (
                <div key={c.key} className="px-1.5 py-2">
                  <input name={`oe_${c.key}`} placeholder={c.ph}
                    className="w-full h-9 px-2 rounded-lg border border-[#EAE8E1] bg-white text-sm text-center text-[#1C1B18] outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 transition-all placeholder:text-[#C8C5BB]" />
                </div>
              ))}
            </div>
          </div>

          {/* Adição + Observações */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                Adição
              </label>
              <input name="adicao" placeholder="+2.00"
                className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all text-center placeholder:text-[#C8C5BB]" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                Observações
              </label>
              <input name="observacoes" placeholder="Lente antirreflexo, transitions..."
                className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar Receita</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
