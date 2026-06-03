'use client'

import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

type TopbarProps = {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-[#EAE8E1] flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-lg font-bold text-[#1C1B18] leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-xs text-[#8C8880]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
          <Input
            placeholder="Buscar..."
            className="pl-8 h-9 w-52 text-sm border-[#EAE8E1] bg-[#F7F6F3] focus-visible:ring-[#1A56FF] placeholder:text-[#C8C5BB]"
          />
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] transition-colors">
          <Bell className="size-4 text-[#8C8880]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1A56FF] rounded-full" />
        </button>
      </div>
    </header>
  )
}
