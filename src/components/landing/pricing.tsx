import Link from 'next/link'
import { Zap, Users, Infinity as InfinityIcon, Check, ArrowRight } from 'lucide-react'

const PLANS = [
  {
    key: 'individual', icon: Zap, label: 'Individual', price: 97,
    desc: 'Ideal para negócios com um único responsável.',
    features: ['1 usuário', 'Agendamentos ilimitados', 'CRM de clientes', 'IA no WhatsApp', 'Financeiro básico'],
    highlight: false,
  },
  {
    key: 'equipe', icon: Users, label: 'Equipe', price: 197,
    desc: 'Para negócios com equipe e múltiplos atendentes.',
    features: ['Até 3 usuários', 'Tudo do Individual', 'CRM completo + tags', 'IA avançada', 'Cobranças', 'Relatórios mensais'],
    highlight: true,
  },
  {
    key: 'ilimitado', icon: InfinityIcon, label: 'Ilimitado', price: 297,
    desc: 'Para negócios em expansão sem limites.',
    features: ['Usuários ilimitados', 'Tudo do Equipe', 'IA multi-instância', 'Relatórios avançados', 'Suporte prioritário'],
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="planos" className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold tracking-[3px] uppercase text-[#1A56FF] mb-3" style={{ fontFamily: 'Barlow, sans-serif' }}>
            Planos
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Preço justo para cada fase do seu negócio
          </h2>
          <p className="mt-4 text-[#8C8880] leading-relaxed">
            Comece com 14 dias grátis em qualquer plano. Sem cartão de crédito, sem multa de cancelamento.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
          {PLANS.map(p => (
            <div key={p.key}
              className={p.highlight ? 'glow-card p-7 sm:scale-105' : 'rounded-2xl border border-[#EAE8E1] p-7 bg-white'}>
              {p.highlight && (
                <span className="inline-block mb-3 text-[10px] font-bold tracking-[2px] uppercase text-white px-2.5 py-1 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)' }}>
                  Mais popular
                </span>
              )}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#EEF2FF' }}>
                <p.icon className="size-5" style={{ color: '#1A56FF' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{p.label}</h3>
              <p className="mt-1 text-sm text-[#8C8880]">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-sm text-[#8C8880]">R$</span>
                <span className="text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{p.price}</span>
                <span className="text-sm text-[#8C8880]">/mês</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#2E2D29]">
                    <Check className="size-4 mt-0.5 shrink-0 text-[#0DB57A]" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/cadastro"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                style={p.highlight
                  ? { background: 'linear-gradient(135deg, #1A56FF 0%, #1445DD 100%)', color: '#fff', boxShadow: '0 4px 24px rgba(26,86,255,0.35)' }
                  : { background: '#F7F6F3', color: '#1C1B18', border: '1px solid #EAE8E1' }}>
                Começar teste grátis <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
