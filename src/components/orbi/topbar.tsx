'use client'

import { Bell, Search } from 'lucide-react'

type TopbarProps = {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-[#EAE8E1] flex items-center justify-between px-6 shrink-0"
      style={{ boxShadow: '0 1px 0 #EAE8E1' }}>
      <div>
        <h1 className="text-base font-black text-[#1C1B18] leading-tight"
          style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-[#8C8880] mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
          <input
            placeholder="Buscar..."
            className="h-8 w-48 pl-8 pr-3 text-xs rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-[#2E2D29] placeholder:text-[#C8C5BB] outline-none focus:border-[#1A56FF] focus:ring-2 focus:ring-[#1A56FF]/10 transition-all"
          />
        </div>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
          <Bell className="size-3.5 text-[#8C8880]" strokeWidth={1.5} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#1A56FF] rounded-full" />
        </button>
      </div>
    </header>
  )
}
