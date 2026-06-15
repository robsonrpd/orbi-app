'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ArrowRight } from 'lucide-react'

const links = [
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#nichos', label: 'Para seu negócio' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'Perguntas' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#EAE8E1]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/brand/icone.png" alt="Orbi" width={36} height={36} />
          <span className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Orbi<span style={{ color: '#1A56FF' }}>.</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[#2E2D29] hover:text-[#1A56FF] transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-[#2E2D29] hover:text-[#1A56FF] transition-colors px-3 py-2">
            Entrar
          </Link>
          <Link href="/cadastro"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', boxShadow: '0 4px 20px rgba(26,86,255,0.3)' }}>
            Teste grátis <ArrowRight className="size-4" />
          </Link>
        </div>

        <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 -mr-2 text-[#2E2D29]" aria-label="Abrir menu">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#EAE8E1] bg-white px-4 sm:px-6 py-4 space-y-3">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block text-sm font-medium text-[#2E2D29] py-1.5">
              {l.label}
            </a>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <Link href="/login" onClick={() => setOpen(false)}
              className="flex-1 h-11 rounded-xl border border-[#EAE8E1] flex items-center justify-center text-sm font-semibold text-[#2E2D29]">
              Entrar
            </Link>
            <Link href="/cadastro" onClick={() => setOpen(false)}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)' }}>
              Teste grátis <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
