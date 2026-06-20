'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, User, HelpCircle, Sparkles, Settings } from 'lucide-react'
import { CentralSuporteModal } from './central-suporte-modal'
import { AtualizacoesModal } from './atualizacoes-modal'

type Me = { name: string; email: string; companyName: string; logoUrl: string | null }

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [suporteOpen, setSuporteOpen] = useState(false)
  const [atualizacoesOpen, setAtualizacoesOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(setMe).catch(() => setMe(null))
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initial = (me?.companyName || me?.name || '?').charAt(0).toUpperCase()

  return (
    <>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 h-9 rounded-full border border-[#EAE8E1] hover:bg-[#F7F6F3] transition-all">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: '#1A56FF' }}>
            {me?.logoUrl ? <img src={me.logoUrl} alt="" className="w-full h-full rounded-full object-cover" /> : initial}
          </div>
          <span className="text-xs font-semibold text-[#1C1B18] hidden sm:block max-w-[120px] truncate">
            {me?.companyName || 'Minha empresa'}
          </span>
          <ChevronDown className={`size-3.5 text-[#8C8880] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-xl border border-[#EAE8E1] overflow-hidden z-50 py-1.5">
            <div className="px-3.5 py-2 border-b border-[#EAE8E1] mb-1">
              <p className="text-sm font-bold text-[#1C1B18] truncate">{me?.name || 'Usuário'}</p>
              <p className="text-xs text-[#8C8880] truncate">{me?.email}</p>
            </div>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#2E2D29] hover:bg-[#F7F6F3] transition-colors">
              <User className="size-4 text-[#8C8880]" strokeWidth={1.5} /> Meu Perfil
            </Link>
            <button onClick={() => { setSuporteOpen(true); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#2E2D29] hover:bg-[#F7F6F3] transition-colors">
              <HelpCircle className="size-4 text-[#8C8880]" strokeWidth={1.5} /> Central de Suporte
            </button>
            <button onClick={() => { setAtualizacoesOpen(true); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#2E2D29] hover:bg-[#F7F6F3] transition-colors">
              <Sparkles className="size-4 text-[#8C8880]" strokeWidth={1.5} /> Atualizações
            </button>
            <Link href="/dashboard/parametros" onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#2E2D29] hover:bg-[#F7F6F3] transition-colors">
              <Settings className="size-4 text-[#8C8880]" strokeWidth={1.5} /> Configurações
            </Link>
          </div>
        )}
      </div>

      {suporteOpen && <CentralSuporteModal onClose={() => setSuporteOpen(false)} />}
      {atualizacoesOpen && <AtualizacoesModal onClose={() => setAtualizacoesOpen(false)} />}
    </>
  )
}
