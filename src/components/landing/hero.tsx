import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0A0F1E 0%, #0D1635 50%, #0A1628 100%)' }}>
      {/* Textura sutil */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      {/* Blobs decorativos */}
      <div className="absolute top-[-120px] right-[-120px] w-[420px] h-[420px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #1A56FF 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-100px] left-[-100px] w-[360px] h-[360px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #1A56FF 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both"
          style={{ background: 'rgba(26,86,255,0.15)', border: '1px solid rgba(26,86,255,0.25)' }}>
          <Sparkles className="size-3.5" style={{ color: '#93AAFF' }} />
          <span className="text-xs font-bold tracking-[2px] uppercase text-[#93AAFF]" style={{ fontFamily: 'Barlow, sans-serif' }}>
            Gestão 360°
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both"
          style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
          O sistema que trabalha{' '}
          <span className="text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #1A56FF, #93AAFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            enquanto você descansa.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
          Agendamentos, clientes, financeiro, estoque e WhatsApp integrado —
          tudo em um só painel, pra você administrar seu negócio sem perder tempo com planilha.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <Link href="/cadastro"
            className="inline-flex items-center justify-center gap-2 h-13 px-7 rounded-xl text-base font-bold text-white transition-all active:scale-[0.98] w-full sm:w-auto"
            style={{ height: '52px', background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', boxShadow: '0 8px 32px rgba(26,86,255,0.4)' }}>
            Testar 14 dias grátis <ArrowRight className="size-5" />
          </Link>
          <a href="https://wa.me/5585999035302?text=Ol%C3%A1!%20Quero%20conhecer%20o%20Orbi."
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-13 px-7 rounded-xl text-base font-bold text-white border border-white/15 hover:bg-white/5 transition-all w-full sm:w-auto"
            style={{ height: '52px' }}>
            <MessageCircle className="size-5 text-[#25D366]" /> Falar no WhatsApp
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40 animate-in fade-in duration-700 delay-300 fill-mode-both">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[#0DB57A]" /> Sem cartão de crédito</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[#0DB57A]" /> Cancele quando quiser</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[#0DB57A]" /> Configuração em minutos</span>
        </div>

        {/* Print do produto */}
        <div className="mt-10 relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both"
          style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)' }}>
          <Image
            src="/brand/Fundo.png"
            alt="Painel Orbi — Dashboard, CRM e WhatsApp integrado"
            width={1536}
            height={1024}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>
    </section>
  )
}
