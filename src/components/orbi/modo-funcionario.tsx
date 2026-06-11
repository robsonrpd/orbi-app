'use client'

import { useState } from 'react'
import { entrarModoFuncionario, sairModoFuncionario, salvarConfigFuncionario } from '@/lib/actions/modo'
import { Lock, Unlock, Settings2, X, Loader2, Check, ShieldCheck } from 'lucide-react'

const BLOQUEIOS = [
  { key: 'faturamento', label: 'Ver faturamento e valores (Dashboard)' },
  { key: 'financeiro', label: 'Acessar o Financeiro' },
  { key: 'caixa', label: 'Acessar o Caixa' },
  { key: 'relatorios', label: 'Acessar Relatórios' },
  { key: 'vendedores', label: 'Acessar Vendedores' },
  { key: 'precos', label: 'Alterar preços de produtos' },
]

type Props = { funcionario: boolean; bloqueios: string[]; temPin: boolean }

export function ModoFuncionario({ funcionario, bloqueios, temPin }: Props) {
  const [configOpen, setConfigOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [sel, setSel] = useState<string[]>(bloqueios)
  const [pin, setPin] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: string) {
    setSel(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key])
  }

  async function salvar() {
    setLoading(true); setError(null)
    const r = await salvarConfigFuncionario(sel, pin)
    setLoading(false)
    if (r?.error) { setError(r.error); return }
    setConfigOpen(false); setPin('')
  }

  async function entrar() {
    setLoading(true)
    await entrarModoFuncionario()
    setLoading(false)
  }

  async function sair() {
    setLoading(true); setError(null)
    const r = await sairModoFuncionario(pinInput)
    setLoading(false)
    if (r?.error) { setError(r.error); return }
    setPinOpen(false); setPinInput('')
  }

  return (
    <>
      {funcionario ? (
        <button onClick={() => setPinOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-all">
          <Lock className="size-4 shrink-0" strokeWidth={1.5} />
          Modo Funcionário ativo
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button onClick={entrar} disabled={loading}
            className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all">
            {loading ? <Loader2 className="size-4 animate-spin shrink-0" /> : <Unlock className="size-4 shrink-0 text-white/50" strokeWidth={1.5} />}
            Modo Funcionário
          </button>
          <button onClick={() => setConfigOpen(true)} title="Configurar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <Settings2 className="size-4" />
          </button>
        </div>
      )}

      {/* Modal de configuração (dono) */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-5 text-white" strokeWidth={1.5} />
                <p className="text-sm font-bold text-white">Configurar Modo Funcionário</p>
              </div>
              <button onClick={() => setConfigOpen(false)} className="text-white/50 hover:text-white"><X className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#8C8880]">Marque o que o funcionário <strong>NÃO</strong> poderá ver ou fazer quando o modo estiver ativo:</p>
              <div className="space-y-2">
                {BLOQUEIOS.map(b => (
                  <button key={b.key} type="button" onClick={() => toggle(b.key)}
                    className="w-full flex items-center justify-between px-3 h-11 rounded-xl bg-[#F7F6F3] border border-[#EAE8E1] hover:border-[#1A56FF]/40 transition-colors">
                    <span className="text-sm text-[#2E2D29] text-left">{b.label}</span>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${sel.includes(b.key) ? 'bg-red-500' : 'bg-white border border-[#EAE8E1]'}`}>
                      {sel.includes(b.key) && <Check className="size-3.5 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider mb-1.5 block">PIN para sair do modo</label>
                <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric" placeholder={temPin ? '•••• (deixe em branco para manter)' : 'Crie um PIN (4-6 dígitos)'}
                  className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all tracking-widest" />
                <p className="text-[11px] text-[#C8C5BB] mt-1">Sem o PIN, o funcionário não consegue voltar a ver as áreas bloqueadas.</p>
              </div>
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>}
              <button onClick={salvar} disabled={loading}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar Configuração</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de PIN para sair */}
      {pinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center mx-auto mb-3">
              <Lock className="size-6 text-[#1A56FF]" strokeWidth={1.5} />
            </div>
            <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Sair do Modo Funcionário</p>
            <p className="text-sm text-[#8C8880] mt-1 mb-4">Digite o PIN do dono para liberar tudo.</p>
            <input value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus inputMode="numeric" placeholder="• • • •"
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
        </div>
      )}
    </>
  )
}
