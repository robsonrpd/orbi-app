'use client'

import { useTransition } from 'react'
import { pararAcesso } from '@/lib/actions/impersonate'
import { Eye, LogOut, Loader2 } from 'lucide-react'

export function ImpersonationBanner({ companyName }: { companyName: string }) {
  const [pending, start] = useTransition()

  return (
    <div className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{ background: 'linear-gradient(90deg, #F59E0B, #D97706)' }}>
      <div className="flex items-center gap-2 text-white text-sm">
        <Eye className="size-4 shrink-0" strokeWidth={2} />
        <span>
          <strong>Modo suporte</strong> — você está acessando como{' '}
          <strong>{companyName}</strong>. Tudo que fizer afeta os dados desta ótica.
        </span>
      </div>
      <button onClick={() => start(() => pararAcesso())} disabled={pending}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-colors"
        style={{ fontFamily: 'Barlow, sans-serif' }}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
        Sair da visualização
      </button>
    </div>
  )
}
