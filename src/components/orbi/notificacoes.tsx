'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Eye, Gift, PackageCheck, ArrowDownCircle, X } from 'lucide-react'

type Notif = {
  tipo: 'receita' | 'aniversario' | 'entrega' | 'conta'
  titulo: string
  desc: string
  href: string
}

const CONFIG = {
  receita: { icon: Eye, color: '#8B5CF6', bg: '#F5F3FF' },
  aniversario: { icon: Gift, color: '#F59E0B', bg: '#FEF3C7' },
  entrega: { icon: PackageCheck, color: '#1A56FF', bg: '#EEF2FF' },
  conta: { icon: ArrowDownCircle, color: '#EF4444', bg: '#FEF2F2' },
}

export function Notificacoes() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notificacoes').then(r => r.ok ? r.json() : []).then(setNotifs).catch(() => setNotifs([]))
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] border border-[#EAE8E1] transition-colors">
        <Bell className="size-3.5 text-[#8C8880]" strokeWidth={1.5} />
        {notifs.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#1A56FF] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {notifs.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#EAE8E1] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#EAE8E1] flex items-center justify-between">
            <p className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Notificações</p>
            <button onClick={() => setOpen(false)} className="text-[#C8C5BB] hover:text-[#8C8880]"><X className="size-4" /></button>
          </div>

          {notifs.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="size-8 text-[#EAE8E1] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-[#8C8880]">Tudo em dia! 🎉</p>
              <p className="text-xs text-[#C8C5BB] mt-0.5">Nenhuma pendência no momento</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-[#F7F6F3]">
              {notifs.map((n, i) => {
                const c = CONFIG[n.tipo]
                return (
                  <Link key={i} href={n.href} onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#F7F6F3] transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.bg }}>
                      <c.icon className="size-4" style={{ color: c.color }} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1C1B18]">{n.titulo}</p>
                      <p className="text-xs text-[#8C8880]">{n.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
