'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react'

type Mode = 'login' | 'recovery'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos. Verifique e tente novamente.')
      setLoading(false); return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const inputCls = "w-full h-12 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10"
  const labelCls = "text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"

  // === MODO RECUPERAÇÃO ===
  // Sem e-mail: quem redefine a senha é quem administra o acesso — o dono da loja (para vendedores)
  // e o suporte do Orbi (para o dono). Nada é enviado por e-mail.
  if (mode === 'recovery') {
    return (
      <div className="space-y-7">
        <button onClick={() => { setMode('login'); setError(null) }}
          className="inline-flex items-center gap-1.5 text-sm text-[#8C8880] hover:text-[#1A56FF] transition-colors">
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1C1B18] leading-tight" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Esqueci minha senha
          </h1>
          <p className="text-sm text-[#8C8880] mt-1">Quem redefine depende de quem você é:</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] p-4">
            <p className="text-sm font-bold text-[#1C1B18]">Sou vendedor ou atendente</p>
            <p className="text-sm text-[#8C8880] mt-1 leading-relaxed">
              Peça ao dono da loja. Ele define uma nova senha para você na tela <strong className="text-[#1C1B18]">Vendedores</strong>.
            </p>
          </div>
          <div className="rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] p-4">
            <p className="text-sm font-bold text-[#1C1B18]">Sou o dono da loja</p>
            <p className="text-sm text-[#8C8880] mt-1 leading-relaxed">
              Fale com o suporte do Orbi, o mesmo contato que te passou o acesso. Você recebe uma senha temporária e troca por uma sua em <strong className="text-[#1C1B18]">Configurações, Alterar senha</strong>.
            </p>
          </div>
        </div>
        <button onClick={() => { setMode('login'); setError(null) }}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{ fontFamily: 'Barlow, sans-serif', letterSpacing: '0.3px', background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', boxShadow: '0 4px 24px rgba(26,86,255,0.35)' }}>
          Voltar ao login
        </button>
      </div>
    )
  }

  // === MODO LOGIN ===
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-black text-[#1C1B18] leading-tight" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-[#8C8880] mt-1">Entre na sua conta para acessar o painel.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          <span className="shrink-0 mt-0.5">⚠️</span>{error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelCls} style={{ fontFamily: 'Barlow, sans-serif' }}>E-mail</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={labelCls} style={{ fontFamily: 'Barlow, sans-serif' }}>Senha</label>
            <button type="button" onClick={() => { setMode('recovery'); setError(null) }}
              className="text-xs text-[#1A56FF] hover:underline font-medium">
              Esqueci a senha
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required
              className="w-full h-12 pl-10 pr-11 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10" />
            <button type="button" onClick={() => setShowPassword(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C8C5BB] hover:text-[#8C8880] transition-colors">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ fontFamily: 'Barlow, sans-serif', letterSpacing: '0.3px', background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', boxShadow: '0 4px 24px rgba(26,86,255,0.35)' }}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <><span>Entrar no painel</span><ArrowRight className="size-4" /></>}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#EAE8E1]" />
        <span className="text-xs text-[#C8C5BB]">ou</span>
        <div className="flex-1 h-px bg-[#EAE8E1]" />
      </div>

      <div className="text-center">
        <p className="text-sm text-[#8C8880]">
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="font-semibold text-[#1A56FF] hover:underline">
            Teste grátis por 14 dias →
          </Link>
        </p>
      </div>
    </div>
  )
}
