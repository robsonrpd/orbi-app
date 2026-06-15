import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0A0F1E 0%, #0D1635 50%, #0A1628 100%)' }}>
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #1A56FF 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          Pronto para automatizar o atendimento do seu negócio?
        </h2>
        <p className="mt-4 text-white/60 leading-relaxed">
          Crie sua conta agora e comece a usar o Orbi em minutos — 14 dias grátis, sem cartão de crédito.
        </p>
        <div className="mt-8">
          <Link href="/cadastro"
            className="inline-flex items-center justify-center gap-2 h-13 px-8 rounded-xl text-base font-bold text-white transition-all active:scale-[0.98]"
            style={{ height: '52px', background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', boxShadow: '0 8px 32px rgba(26,86,255,0.4)' }}>
            Criar minha conta grátis <ArrowRight className="size-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
