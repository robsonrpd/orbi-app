'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos. Verifique e tente novamente.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1C1B18] leading-tight"
          style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-[#8C8880] mt-1">
          Entre na sua conta para acessar o painel.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          <span className="shrink-0 mt-0.5">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* E-mail */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"
            style={{ fontFamily: 'Barlow, sans-serif' }}>
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10"
            />
          </div>
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              Senha
            </label>
            <button type="button" className="text-xs text-[#1A56FF] hover:underline">
              Esqueci a senha
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10"
            />
          </div>
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            fontFamily: 'Barlow, sans-serif',
            letterSpacing: '0.3px',
            background: loading ? '#1A56FF' : 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)',
            boxShadow: '0 4px 24px rgba(26,86,255,0.35)'
          }}>
          {loading
            ? <Loader2 className="size-4 animate-spin" />
            : <><span>Entrar no painel</span><ArrowRight className="size-4" /></>
          }
        </button>
      </form>

      {/* Divisor */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#EAE8E1]" />
        <span className="text-xs text-[#C8C5BB]">ou</span>
        <div className="flex-1 h-px bg-[#EAE8E1]" />
      </div>

      {/* Link cadastro */}
      <div className="text-center">
        <p className="text-sm text-[#8C8880]">
          Ainda não tem conta?{' '}
          <Link href="/cadastro"
            className="font-semibold text-[#1A56FF] hover:underline">
            Teste grátis por 14 dias →
          </Link>
        </p>
      </div>
    </div>
  )
}
