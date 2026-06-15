import { UserPlus, Settings, Bot } from 'lucide-react'
import { LaptopMockup } from './laptop-mockup'

const steps = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Crie sua conta',
    desc: 'Cadastro rápido em menos de 5 minutos, com 14 dias de teste grátis e sem cartão de crédito.',
  },
  {
    icon: Settings,
    step: '2',
    title: 'Configure seu negócio',
    desc: 'Suba sua logo, cadastre produtos/serviços, horários e conecte o WhatsApp da sua loja.',
  },
  {
    icon: Bot,
    step: '3',
    title: 'A IA assume o atendimento',
    desc: 'Seus clientes são atendidos automaticamente, agendam horários e você acompanha tudo pelo painel.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-14 sm:py-20 bg-[#F7F6F3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <p className="text-xs font-bold tracking-[3px] uppercase text-[#1A56FF] mb-3" style={{ fontFamily: 'Barlow, sans-serif' }}>
            Simples assim
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Comece a usar em minutos
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {steps.map((s, i) => (
            <div key={s.step}
              className="relative text-center animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
              style={{ animationDuration: '700ms', animationDelay: `${i * 120}ms` }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto relative"
                style={{ background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', boxShadow: '0 8px 24px rgba(26,86,255,0.3)' }}>
                <s.icon className="size-7 text-white" strokeWidth={1.5} />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-[#EAE8E1] flex items-center justify-center text-xs font-black text-[#1A56FF]">
                  {s.step}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{s.title}</h3>
              <p className="mt-2 text-sm text-[#8C8880] leading-relaxed max-w-xs mx-auto">{s.desc}</p>

              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-8 left-[calc(100%-1.5rem)] w-[calc(100%-2rem)] h-px"
                  style={{ background: 'repeating-linear-gradient(90deg, #C8C5BB 0, #C8C5BB 6px, transparent 6px, transparent 12px)' }} />
              )}
            </div>
          ))}
        </div>

        <LaptopMockup />
      </div>
    </section>
  )
}
