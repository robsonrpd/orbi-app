'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function CadastroPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' })
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

    // 1. Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    // 2. Cria empresa e usuário via API route (usa service role)
    const res = await fetch('/api/setup-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authData.user.id,
        email: form.email,
        name: form.name,
        companyName: form.company,
      }),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
          Criar sua conta
        </h2>
        <p className="text-sm text-[#8C8880] mt-1">Configure em menos de 10 minutos.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[#2E2D29] text-sm font-medium">Seu nome</Label>
          <Input id="name" placeholder="João Silva" value={form.name}
            onChange={e => set('name', e.target.value)} required
            className="h-11 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company" className="text-[#2E2D29] text-sm font-medium">Nome do negócio</Label>
          <Input id="company" placeholder="Ótica Central" value={form.company}
            onChange={e => set('company', e.target.value)} required
            className="h-11 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[#2E2D29] text-sm font-medium">E-mail</Label>
        <Input id="email" type="email" placeholder="seu@email.com" value={form.email}
          onChange={e => set('email', e.target.value)} required
          className="h-11 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[#2E2D29] text-sm font-medium">Senha</Label>
        <Input id="password" type="password" placeholder="Mínimo 8 caracteres" value={form.password}
          onChange={e => set('password', e.target.value)} required minLength={8}
          className="h-11 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
      </div>

      <Button type="submit" disabled={loading}
        className="w-full h-11 bg-[#1A56FF] hover:bg-[#1445DD] text-white font-semibold text-sm"
        style={{ fontFamily: 'Barlow, sans-serif', letterSpacing: '0.3px' }}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : 'Criar conta grátis'}
      </Button>

      <p className="text-center text-sm text-[#8C8880]">
        Já tem conta?{' '}
        <Link href="/login" className="text-[#1A56FF] font-medium hover:underline">Entrar</Link>
      </p>
    </form>
  )
}
