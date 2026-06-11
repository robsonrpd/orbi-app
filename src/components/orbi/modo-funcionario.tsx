'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { operarComoVendedor, sairComoVendedor, salvarPinDono } from '@/lib/actions/modo'
import { Lock, X, Loader2, Check, UserCog, KeyRound, ChevronDown } from 'lucide-react'

// Renderiza fora da sidebar (que tem stacking context próprio via position:sticky),
// senão os modais aparecem ATRÁS do conteúdo do dashboard.
function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

type VendedorMini = { id: string; nome: string }

type Props = {
  funcionario: boolean
  vendedorNome: string | null
  temPin: boolean
  vendedores: VendedorMini[]
}

export function ModoFuncionario({ funcionario, vendedorNome, temPin, vendedores }: Props) {
  const [listaOpen, setListaOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [novoPin, setNovoPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function operar(id: string) {
    setLoading(true); setListaOpen(false)
    await operarComoVendedor(id)
    setLoading(false)
  }
  async function sair() {
    setLoading(true); setError(null)
    const r = await sairComoVendedor(pinInput)
    setLoading(false)
    if (r?.error) { setError(r.error); return }
    setPinOpen(false); setPinInput('')
  }
  async function salvarPin() {
    setLoading(true); setError(null)
    const r = await salvarPinDono(novoPin)
    setLoading(false)
    if (r?.error) { setError(r.error); return }
    setCfgOpen(false); setNovoPin('')
  }

  return (
    <>
      {funcionario ? (
        <button onClick={() => setPinOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-all">
          <Lock className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">Operando: {vendedorNome}</span>
        </button>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-1">
            <button onClick={() => setListaOpen(o => !o)}
              className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all">
              {loading ? <Loader2 className="size-4 animate-spin shrink-0" /> : <UserCog className="size-4 shrink-0 text-white/50" strokeWidth={1.5} />}
              <span className="flex-1 text-left">Operar como vendedor</span>
              <ChevronDown className="size-3.5 text-white/40" />
            </button>
            <button onClick={() => setCfgOpen(true)} title="PIN do dono"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
              <KeyRound className="size-4" />
            </button>
          </div>
          {listaOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#0D1635] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 max-h-60 overflow-y-auto">
              {vendedores.length === 0 ? (
                <p className="text-xs text-white/40 px-3 py-3 text-center">Cadastre vendedores primeiro.</p>
              ) : vendedores.map(v => (
                <button key={v.id} onClick={() => operar(v.id)}
                  className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors">
                  {v.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal PIN para sair */}
      {pinOpen && (
        <Portal><div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center mx-auto mb-3"><Lock className="size-6 text-[#1A56FF]" strokeWidth={1.5} /></div>
            <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Voltar para visão de Dono</p>
            <p className="text-sm text-[#8C8880] mt-1 mb-4">Digite o PIN do dono.</p>
            <input value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus inputMode="numeric" placeholder="• • • •"
              onKeyDown={e => { if (e.key === 'Enter') sair() }}
              className="w-full h-12 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-center text-lg tracking-[0.5em] outline-none focus:border-[#1A56FF] transition-all" />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setPinOpen(false); setError(null); setPinInput('') }} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
              <button onClick={sair} disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Liberar'}
              </button>
            </div>
          </div>
        </div></Portal>
      )}

      {/* Modal config PIN do dono */}
      {cfgOpen && (
        <Portal><div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center mx-auto mb-3"><KeyRound className="size-6 text-[#1A56FF]" strokeWidth={1.5} /></div>
            <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>PIN do Dono</p>
            <p className="text-sm text-[#8C8880] mt-1 mb-4">Usado para voltar da visão de vendedor para a sua.</p>
            <input value={novoPin} onChange={e => setNovoPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus inputMode="numeric"
              placeholder={temPin ? 'Trocar PIN (em branco = manter)' : 'Crie um PIN (4-6 dígitos)'}
              className="w-full h-12 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-center text-lg tracking-[0.4em] outline-none focus:border-[#1A56FF] transition-all" />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setCfgOpen(false); setError(null); setNovoPin('') }} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
              <button onClick={salvarPin} disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar</>}
              </button>
            </div>
          </div>
        </div></Portal>
      )}
    </>
  )
}
