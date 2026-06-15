import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#EAE8E1]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-10">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/brand/icone.png" alt="Orbi" width={32} height={32} />
              <span className="text-lg font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                Orbi<span style={{ color: '#1A56FF' }}>.</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-[#8C8880] leading-relaxed">
              O sistema que trabalha enquanto você descansa. Gestão 360° com IA para o seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-2.5">
              <p className="text-xs font-bold tracking-[2px] uppercase text-[#C8C5BB]" style={{ fontFamily: 'Barlow, sans-serif' }}>Produto</p>
              <a href="#funcionalidades" className="block text-[#2E2D29] hover:text-[#1A56FF] transition-colors">Funcionalidades</a>
              <a href="#nichos" className="block text-[#2E2D29] hover:text-[#1A56FF] transition-colors">Para seu negócio</a>
              <a href="#planos" className="block text-[#2E2D29] hover:text-[#1A56FF] transition-colors">Planos</a>
              <a href="#faq" className="block text-[#2E2D29] hover:text-[#1A56FF] transition-colors">Perguntas</a>
            </div>
            <div className="space-y-2.5">
              <p className="text-xs font-bold tracking-[2px] uppercase text-[#C8C5BB]" style={{ fontFamily: 'Barlow, sans-serif' }}>Conta</p>
              <Link href="/login" className="block text-[#2E2D29] hover:text-[#1A56FF] transition-colors">Entrar</Link>
              <Link href="/cadastro" className="block text-[#2E2D29] hover:text-[#1A56FF] transition-colors">Criar conta</Link>
            </div>
            <div className="space-y-2.5 col-span-2 sm:col-span-1">
              <p className="text-xs font-bold tracking-[2px] uppercase text-[#C8C5BB]" style={{ fontFamily: 'Barlow, sans-serif' }}>Contato</p>
              <a href="https://wa.me/5585999035302?text=Ol%C3%A1!%20Quero%20conhecer%20o%20Orbi."
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#2E2D29] hover:text-[#1A56FF] transition-colors">
                <MessageCircle className="size-4 text-[#25D366]" /> WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#EAE8E1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#C8C5BB]">
          <p>© {new Date().getFullYear()} Orbi. — RP Marketing</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0DB57A]" />
            Sistema online
          </div>
        </div>
      </div>
    </footer>
  )
}
