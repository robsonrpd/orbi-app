'use client'

import { Search, Menu } from 'lucide-react'
import { Notificacoes } from './notificacoes'
import { useMobileNav } from './mobile-nav'

type TopbarProps = {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { setOpen } = useMobileNav()

  return (
    <header className="h-14 bg-white border-b border-[#EAE8E1] flex items-center justify-between px-3 md:px-6 shrink-0 gap-2"
      style={{ boxShadow: '0 1px 0 #EAE8E1' }}>
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setOpen(true)}
          className="md:hidden -ml-1 p-2 rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] shrink-0"
          aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-black text-[#1C1B18] leading-tight truncate"
            style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#8C8880] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
          <input
            placeholder="Buscar..."
            className="h-8 w-48 pl-8 pr-3 text-xs rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-[#2E2D29] placeholder:text-[#C8C5BB] outline-none focus:border-[#1A56FF] focus:ring-2 focus:ring-[#1A56FF]/10 transition-all"
          />
        </div>
        <Notificacoes />
      </div>
    </header>
  )
}
