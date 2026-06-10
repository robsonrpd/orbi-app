'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthLabel = ['', 'Fraca', 'Média', 'Forte']
  const strengthColor = ['', '#EF4444', '#F59E0B', '#0DB57A']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('Não foi possível redefinir. O link pode ter expirado — solicite um novo.'); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const inputCls = "w-full h-12 pl-10 pr-11 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10"
  const labelCls = "text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-2xl bg-[#E6F9F3] flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-[#0DB57A]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Senha redefinida!</h1>
          <p className="text-sm text-[#8C8880] mt-1.5">Entrando no painel...</p>
        </div>
        <Loader2 className="size-5 animate-spin text-[#1A56FF] mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-black text-[#1C1B18] leading-tight" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          Criar nova senha
        </h1>
        <p className="text-sm text-[#8C8880] mt-1">Escolha uma senha forte para sua conta.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          <span className="shrink-0 mt-0.5">⚠️</span>{error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelCls} style={{ fontFamily: 'Barlow, sans-serif' }}>Nova senha</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input type={show ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={8} className={inputCls} />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C8C5BB] hover:text-[#8C8880]">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i <= strength ? strengthColor[strength] : '#EAE8E1' }} />
                ))}
              </div>
              <span className="text-xs font-medium" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className={labelCls} style={{ fontFamily: 'Barlow, sans-serif' }}>Confirmar senha</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input type={show ? 'text' : 'password'} placeholder="Repita a senha" value={confirm}
              onChange={e => setConfirm(e.target.value)} required className={inputCls} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ fontFamily: 'Barlow, sans-serif', letterSpacing: '0.3px', background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', boxShadow: '0 4px 24px rgba(26,86,255,0.35)' }}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <><span>Redefinir senha</span><ArrowRight className="size-4" /></>}
        </button>
      </form>
    </div>
  )
}
