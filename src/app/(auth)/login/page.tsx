'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

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
      setError('E-mail ou senha incorretos.')
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
          Entrar na sua conta
        </h2>
        <p className="text-sm text-[#8C8880] mt-1">Bem-vindo de volta.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[#2E2D29] text-sm font-medium">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 border-[#EAE8E1] focus-visible:ring-[#1A56FF]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[#2E2D29] text-sm font-medium">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11 border-[#EAE8E1] focus-visible:ring-[#1A56FF]"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-[#1A56FF] hover:bg-[#1445DD] text-white font-semibold text-sm"
        style={{ fontFamily: 'Barlow, sans-serif', letterSpacing: '0.3px' }}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : 'Entrar'}
      </Button>

      <p className="text-center text-sm text-[#8C8880]">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-[#1A56FF] font-medium hover:underline">
          Criar agora
        </Link>
      </p>
    </form>
  )
}
