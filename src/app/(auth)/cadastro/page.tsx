'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, User, Building2, Mail, Lock, ArrowRight, Check, Phone } from 'lucide-react'

const perks = ['14 dias grátis', 'Sem cartão de crédito', 'Cancele quando quiser']

export default function CadastroPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/setup-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, companyName: form.company, phone: form.phone }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erro ao configurar a conta.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const passwordStrength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2
    : 3

  const strengthLabel = ['', 'Fraca', 'Média', 'Forte']
  const strengthColor = ['', '#EF4444', '#F59E0B', '#0DB57A']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1C1B18] leading-tight"
          style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          Comece agora
        </h1>
        <p className="text-sm text-[#8C8880] mt-1">
          Configure sua ótica em menos de 5 minutos.
        </p>
        {/* Perks */}
        <div className="flex items-center gap-3 mt-3">
          {perks.map(p => (
            <div key={p} className="flex items-center gap-1">
              <Check className="size-3 text-[#0DB57A]" strokeWidth={2.5} />
              <span className="text-xs text-[#8C8880]">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          <span className="shrink-0 mt-0.5">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Nome + Ótica */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              Seu nome
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
              <input placeholder="João Silva" value={form.name}
                onChange={e => set('name', e.target.value)} required
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              Nome da ótica
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
              <input placeholder="Ótica Central" value={form.company}
                onChange={e => set('company', e.target.value)} required
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10" />
            </div>
          </div>
        </div>

        {/* E-mail */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"
            style={{ fontFamily: 'Barlow, sans-serif' }}>
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input type="email" placeholder="seu@email.com" value={form.email}
              onChange={e => set('email', e.target.value)} required
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10" />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"
            style={{ fontFamily: 'Barlow, sans-serif' }}>
            WhatsApp
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input type="tel" placeholder="(85) 99999-9999" value={form.phone}
              onChange={e => set('phone', e.target.value)} required
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10" />
          </div>
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#2E2D29] uppercase tracking-wider"
            style={{ fontFamily: 'Barlow, sans-serif' }}>
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input type="password" placeholder="Mínimo 8 caracteres" value={form.password}
              onChange={e => set('password', e.target.value)} required minLength={8}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10" />
          </div>
          {/* Indicador de força */}
          {form.password.length > 0 && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i <= passwordStrength ? strengthColor[passwordStrength] : '#EAE8E1' }} />
                ))}
              </div>
              <span className="text-xs font-medium" style={{ color: strengthColor[passwordStrength] }}>
                {strengthLabel[passwordStrength]}
              </span>
            </div>
          )}
        </div>

        {/* Botão */}
        <button type="submit" disabled={loading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
          style={{
            fontFamily: 'Barlow, sans-serif',
            letterSpacing: '0.3px',
            background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)',
            boxShadow: '0 4px 24px rgba(26,86,255,0.35)'
          }}>
          {loading
            ? <Loader2 className="size-4 animate-spin" />
            : <><span>Criar conta grátis</span><ArrowRight className="size-4" /></>
          }
        </button>
      </form>

      <p className="text-center text-xs text-[#C8C5BB] leading-relaxed">
        Ao criar sua conta você concorda com os{' '}
        <button className="text-[#8C8880] hover:underline">Termos de Uso</button>
        {' '}e a{' '}
        <button className="text-[#8C8880] hover:underline">Política de Privacidade</button>.
      </p>

      <div className="text-center">
        <p className="text-sm text-[#8C8880]">
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-[#1A56FF] hover:underline">
            Entrar →
          </Link>
        </p>
      </div>
    </div>
  )
}
