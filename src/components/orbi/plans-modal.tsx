'use client'

import { useState } from 'react'
import { X, Check, Zap, Users, Infinity, ArrowRight } from 'lucide-react'

type Props = {
  onClose: () => void
  currentPlan?: string
}

const plans = [
  {
    key: 'individual',
    icon: Zap,
    label: 'Individual',
    price: 97,
    period: '/mês',
    desc: 'Ideal para óticas com um único responsável.',
    features: [
      '1 usuário administrador',
      'Agendamentos ilimitados',
      'CRM de clientes',
      'IA no WhatsApp',
      'Financeiro básico',
    ],
    cta: 'Assinar Individual',
    highlight: false,
    badge: null,
  },
  {
    key: 'equipe',
    icon: Users,
    label: 'Equipe',
    price: 197,
    period: '/mês',
    desc: 'Para óticas com equipe pequena e múltiplos atendentes.',
    features: [
      'Até 3 usuários',
      'Agendamentos ilimitados',
      'CRM completo + tags',
      'IA no WhatsApp avançada',
      'Financeiro + cobranças',
      'Relatórios mensais',
    ],
    cta: 'Assinar Equipe',
    highlight: true,
    badge: 'MAIS POPULAR',
  },
  {
    key: 'ilimitado',
    icon: Infinity,
    label: 'Ilimitado',
    price: 297,
    period: '/mês',
    desc: 'Para óticas em expansão sem limite de crescimento.',
    features: [
      'Usuários ilimitados',
      'Agendamentos ilimitados',
      'CRM completo',
      'IA no WhatsApp + multi-instância',
      'Financeiro completo',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
    cta: 'Assinar Ilimitado',
    highlight: false,
    badge: null,
  },
]

export function PlansModal({ onClose, currentPlan }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelect(planKey: string) {
    setLoading(planKey)
    // Integração Asaas aqui futuramente
    await new Promise(r => setTimeout(r, 1000))
    setLoading(null)
    alert(`Em breve: integração com Asaas para o plano ${planKey}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0D1635', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-[#1A56FF] uppercase tracking-[2px] mb-2"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              Escolha seu plano
            </p>
            <h2 className="text-3xl font-black text-white"
              style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
              Invista no crescimento<br />
              <span style={{
                backgroundImage: 'linear-gradient(90deg, #1A56FF, #93AAFF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                da sua ótica.
              </span>
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all mt-1">
            <X className="size-4" />
          </button>
        </div>

        {/* Cards */}
        <div className="px-8 pb-8 grid grid-cols-3 gap-4">
          {plans.map(plan => {
            const Icon = plan.icon
            const isCurrent = currentPlan === plan.key
            return (
              <div key={plan.key}
                className="rounded-2xl p-5 flex flex-col transition-all"
                style={{
                  background: plan.highlight
                    ? 'linear-gradient(145deg, #1A3A8F, #1A56FF22)'
                    : 'rgba(255,255,255,0.04)',
                  border: plan.highlight
                    ? '1px solid rgba(26,86,255,0.6)'
                    : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: plan.highlight ? '0 0 32px rgba(26,86,255,0.2)' : 'none'
                }}>

                {plan.badge && (
                  <div className="mb-3 self-start px-2 py-1 rounded-full text-[9px] font-black"
                    style={{
                      background: '#1A56FF',
                      color: 'white',
                      fontFamily: 'Barlow, sans-serif',
                      letterSpacing: '1.5px'
                    }}>
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: plan.highlight ? 'rgba(255,255,255,0.15)' : 'rgba(26,86,255,0.15)' }}>
                    <Icon className="size-4 text-[#93AAFF]" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-bold text-white"
                    style={{ fontFamily: 'Barlow, sans-serif' }}>
                    {plan.label}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-white/40">R$</span>
                    <span className="text-3xl font-black text-white"
                      style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                      {plan.price}
                    </span>
                    <span className="text-xs text-white/40">{plan.period}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(13,181,122,0.2)' }}>
                        <Check className="size-2.5 text-[#0DB57A]" strokeWidth={3} />
                      </div>
                      <span className="text-xs text-white/60">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSelect(plan.key)}
                  disabled={!!loading || isCurrent}
                  className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    fontFamily: 'Barlow, sans-serif',
                    letterSpacing: '0.3px',
                    background: plan.highlight
                      ? 'linear-gradient(135deg, #1A56FF, #1445DD)'
                      : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    boxShadow: plan.highlight ? '0 4px 16px rgba(26,86,255,0.4)' : 'none'
                  }}>
                  {loading === plan.key
                    ? 'Processando...'
                    : isCurrent ? 'Plano atual'
                    : <>{plan.cta} <ArrowRight className="size-3.5" /></>
                  }
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-white/20">
            Todos os planos incluem 14 dias de teste grátis. Cancele quando quiser.
          </p>
        </div>
      </div>
    </div>
  )
}
