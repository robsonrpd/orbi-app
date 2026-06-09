'use client'

import { useState, useRef } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { createVendedor, deleteVendedor } from '@/lib/actions/vendedores'
import { Users, Plus, Phone, Percent, Trash2, Loader2, X, Check, Award } from 'lucide-react'

type Vendedor = {
  id: string; nome: string; telefone: string | null
  comissao_percent: number; active: boolean
}

export function VendedoresClient({ vendedores }: { vendedores: Vendedor[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const result = await createVendedor(new FormData(formRef.current!))
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    formRef.current?.reset()
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteVendedor(id)
    setDeletingId(null)
  }

  const inputCls = "w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]"

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
              Vendedores
            </h2>
            <p className="text-sm text-[#8C8880] mt-0.5">Equipe de vendas e comissões</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            <Plus className="size-4" /> Novo Vendedor
          </button>
        </div>

        {vendedores.length === 0 ? (
          <GlowCard>
            <div className="p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <Users className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#1C1B18]">Nenhum vendedor cadastrado</p>
                <p className="text-sm text-[#8C8880] mt-1">Cadastre sua equipe para acompanhar comissões e ranking.</p>
              </div>
              <button onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                <Plus className="size-4" /> Cadastrar vendedor
              </button>
            </div>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {vendedores.map((v, i) => (
              <GlowCard key={v.id}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
                        style={{ background: i === 0 ? 'linear-gradient(135deg,#1A56FF,#0D3ACC)' : 'linear-gradient(135deg,#93AAFF,#1A56FF)' }}>
                        {v.nome[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1C1B18]">{v.nome}</p>
                        {v.telefone && (
                          <p className="text-xs text-[#8C8880] flex items-center gap-1 mt-0.5">
                            <Phone className="size-3" /> {v.telefone}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(v.id)} disabled={deletingId === v.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                      {deletingId === v.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#E6F9F3] text-[#0DB57A] font-semibold">
                      <Percent className="size-3" strokeWidth={2.5} /> {Number(v.comissao_percent)}% comissão
                    </span>
                    {i === 0 && (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#F59E0B] font-semibold">
                        <Award className="size-3" /> Top
                      </span>
                    )}
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Users className="size-4 text-white" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-white">Novo Vendedor</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>
            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Nome <span className="text-red-400">*</span></label>
                <input name="nome" required placeholder="Nome do vendedor" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Telefone</label>
                  <input name="telefone" placeholder="85 99999-9999" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Comissão (%)</label>
                  <input name="comissao" type="number" min="0" max="100" step="0.5" placeholder="5" className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all"
                  style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
