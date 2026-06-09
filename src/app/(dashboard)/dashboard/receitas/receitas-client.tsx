'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { NovaReceitaModal } from '@/components/orbi/nova-receita-modal'
import { deleteReceita } from '@/lib/actions/receitas'
import {
  Eye, Plus, Search, Stethoscope, Calendar, Trash2,
  Glasses, Loader2, FileText
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Receita = {
  id: string; contact_id: string; medico: string | null; data_receita: string
  od_esferico: string | null; od_cilindrico: string | null; od_eixo: string | null; od_dnp: string | null; od_altura: string | null
  oe_esferico: string | null; oe_cilindrico: string | null; oe_eixo: string | null; oe_dnp: string | null; oe_altura: string | null
  adicao: string | null; observacoes: string | null; created_at: string
  contacts: Contact | null
}

function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const COLS = ['Esférico', 'Cilíndrico', 'Eixo', 'DNP', 'Altura']

function MiniGrade({ r }: { r: Receita }) {
  const od = [r.od_esferico, r.od_cilindrico, r.od_eixo, r.od_dnp, r.od_altura]
  const oe = [r.oe_esferico, r.oe_cilindrico, r.oe_eixo, r.oe_dnp, r.oe_altura]
  return (
    <div className="rounded-lg border border-[#EAE8E1] overflow-hidden">
      <div className="grid grid-cols-6 bg-[#F7F6F3] border-b border-[#EAE8E1]">
        <div className="px-2 py-1.5 text-[9px] font-bold text-[#8C8880] uppercase" style={{ fontFamily: 'Barlow, sans-serif' }}>Olho</div>
        {COLS.map(c => (
          <div key={c} className="px-1 py-1.5 text-[9px] font-bold text-[#8C8880] text-center" style={{ fontFamily: 'Barlow, sans-serif' }}>{c}</div>
        ))}
      </div>
      <div className="grid grid-cols-6 border-b border-[#EAE8E1] items-center">
        <div className="px-2 py-1.5">
          <span className="text-[10px] font-black text-[#1A56FF]" style={{ fontFamily: 'Barlow, sans-serif' }}>OD</span>
        </div>
        {od.map((v, i) => (
          <div key={i} className="px-1 py-1.5 text-center text-xs font-medium text-[#1C1B18]">{v || '—'}</div>
        ))}
      </div>
      <div className="grid grid-cols-6 items-center">
        <div className="px-2 py-1.5">
          <span className="text-[10px] font-black text-[#8B5CF6]" style={{ fontFamily: 'Barlow, sans-serif' }}>OE</span>
        </div>
        {oe.map((v, i) => (
          <div key={i} className="px-1 py-1.5 text-center text-xs font-medium text-[#1C1B18]">{v || '—'}</div>
        ))}
      </div>
    </div>
  )
}

export function ReceitasClient({ receitas, contacts }: { receitas: Receita[]; contacts: Contact[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = receitas.filter(r =>
    !search ||
    (r.contacts?.name ?? r.contacts?.phone ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.medico ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteReceita(id)
    setDeletingId(null)
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
              Receitas (RX)
            </h2>
            <p className="text-sm text-[#8C8880] mt-0.5">Medidas ópticas dos seus clientes</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            <Plus className="size-4" /> Nova Receita
          </button>
        </div>

        {receitas.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente ou médico..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-white text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
          </div>
        )}

        {filtered.length === 0 ? (
          <GlowCard>
            <div className="p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <Eye className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#1C1B18]">
                  {receitas.length === 0 ? 'Nenhuma receita cadastrada' : 'Nenhum resultado'}
                </p>
                <p className="text-sm text-[#8C8880] mt-1">
                  {receitas.length === 0 ? 'Registre a receita óptica dos seus clientes.' : 'Tente outro termo de busca.'}
                </p>
              </div>
              {receitas.length === 0 && (
                <button onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                  <Plus className="size-4" /> Cadastrar primeira receita
                </button>
              )}
            </div>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(r => (
              <GlowCard key={r.id}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center text-sm font-bold text-[#1A56FF]">
                        {(r.contacts?.name ?? r.contacts?.phone ?? '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1C1B18]">{r.contacts?.name ?? r.contacts?.phone ?? '—'}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {r.medico && (
                            <span className="flex items-center gap-1 text-xs text-[#8C8880]">
                              <Stethoscope className="size-3" /> {r.medico}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-[#C8C5BB]">
                            <Calendar className="size-3" /> {fmtDate(r.data_receita)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                      {deletingId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>

                  <MiniGrade r={r} />

                  {(r.adicao || r.observacoes) && (
                    <div className="flex items-center gap-3 mt-3">
                      {r.adicao && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#FEF3C7] text-[#F59E0B] font-semibold">
                          Adição: {r.adicao}
                        </span>
                      )}
                      {r.observacoes && (
                        <span className="text-xs text-[#8C8880] flex items-center gap-1">
                          <FileText className="size-3" /> {r.observacoes}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>

      <NovaReceitaModal open={modalOpen} onClose={() => setModalOpen(false)} contacts={contacts} />
    </>
  )
}
