'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { listarMinhasEmpresas, trocarEmpresaAtiva, criarNovaEmpresa, type MinhaEmpresa } from '@/lib/actions/empresas'
import { NICHOS } from '@/lib/nichos'
import { Building2, Plus, Check, Loader2, X } from 'lucide-react'

export function MinhasEmpresas() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<MinhaEmpresa[]>([])
  const [ativaId, setAtivaId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [trocandoId, setTrocandoId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [ramo, setRamo] = useState(NICHOS[0]?.key ?? 'otica')
  const [criando, setCriando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listarMinhasEmpresas().then(r => { setEmpresas(r.empresas); setAtivaId(r.ativaId); setCarregando(false) })
  }, [])

  async function trocar(id: string) {
    if (id === ativaId) return
    setTrocandoId(id)
    const r = await trocarEmpresaAtiva(id)
    setTrocandoId(null)
    if (!r?.error) { router.push('/dashboard'); router.refresh() }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setCriando(true); setError(null)
    const r = await criarNovaEmpresa({ nome, businessType: ramo })
    setCriando(false)
    if (r?.error) { setError(r.error); return }
    setModalOpen(false); setNome('')
    router.push('/dashboard'); router.refresh()
  }

  if (carregando) return null

  return (
    <div className="bg-white rounded-xl border border-[#EAE8E1] p-5 space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-[#EAE8E1]">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-[#1A56FF]" />
          <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
            Minhas Empresas
          </h2>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#1A56FF] hover:underline">
          <Plus className="size-3.5" /> Nova empresa
        </button>
      </div>

      <p className="text-xs text-[#8C8880]">
        Se você tem mais de um negócio, pode gerenciar todos com o mesmo login. Cada empresa fica
        completamente separada (clientes, financeiro, tudo isolado).
      </p>

      <div className="space-y-2">
        {empresas.map(emp => {
          const atual = emp.id === ativaId
          return (
            <button key={emp.id} onClick={() => trocar(emp.id)} disabled={atual || trocandoId === emp.id}
              className="w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors"
              style={{ borderColor: atual ? '#1A56FF' : '#EAE8E1', background: atual ? '#EEF2FF' : 'white' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F7F6F3] flex items-center justify-center overflow-hidden shrink-0">
                  {emp.logo_url ? <img src={emp.logo_url} alt="" className="w-full h-full object-contain" /> : <Building2 className="size-4 text-[#C8C5BB]" />}
                </div>
                <p className="text-sm font-semibold text-[#1C1B18]">{emp.name}</p>
              </div>
              {atual ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#1A56FF]"><Check className="size-3.5" /> Atual</span>
              ) : trocandoId === emp.id ? (
                <Loader2 className="size-4 animate-spin text-[#8C8880]" />
              ) : (
                <span className="text-xs font-semibold text-[#8C8880]">Trocar</span>
              )}
            </button>
          )
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
              <p className="text-sm font-bold text-white">Nova Empresa</p>
              <button onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white"><X className="size-5" /></button>
            </div>
            <form onSubmit={criar} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div>
                <label className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1">Nome da empresa</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required autoFocus placeholder="Ex: Minha Segunda Loja"
                  className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1">Ramo</label>
                <select value={ramo} onChange={e => setRamo(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]">
                  {NICHOS.map(n => <option key={n.key} value={n.key}>{n.emoji} {n.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-[#C8C5BB]">Essa empresa começa do zero, com seu próprio período de teste — nenhum dado é compartilhado com suas outras empresas.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
                <button type="submit" disabled={criando} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
                  {criando ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Criar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
