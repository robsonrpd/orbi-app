'use client'

import { useState } from 'react'
import { Zap, Users, Infinity as InfinityIcon, Check, ArrowRight, Loader2, Crown, Clock } from 'lucide-react'

const PLANS = [
  {
    key: 'individual', icon: Zap, label: 'Individual', price: 97,
    desc: 'Ideal para óticas com um único responsável.',
    features: ['1 usuário', 'Agendamentos ilimitados', 'CRM de clientes', 'IA no WhatsApp', 'Financeiro básico'],
    highlight: false, badge: null,
  },
  {
    key: 'equipe', icon: Users, label: 'Equipe', price: 197,
    desc: 'Para óticas com equipe e múltiplos atendentes.',
    features: ['Até 3 usuários', 'Tudo do Individual', 'CRM completo + tags', 'IA avançada', 'Cobranças', 'Relatórios mensais'],
    highlight: true, badge: 'MAIS POPULAR',
  },
  {
    key: 'ilimitado', icon: InfinityIcon, label: 'Ilimitado', price: 297,
    desc: 'Para óticas em expansão sem limites.',
    features: ['Usuários ilimitados', 'Tudo do Equipe', 'IA multi-instância', 'Relatórios avançados', 'Suporte prioritário'],
    highlight: false, badge: null,
  },
]

const STATUS_LABEL: Record<string, string> = { trial: 'Em teste grátis', active: 'Ativo', overdue: 'Pagamento atrasado', cancelled: 'Cancelado' }

export function PlanoClient({ status, planoAtual, trialEndsAt }: { status: string; planoAtual: string | null; trialEndsAt: string | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const diasTrial = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)) : 0

  async function assinar(key: string) {
    setLoading(key)
    await new Promise(r => setTimeout(r, 800))
    setLoading(null)
    alert('Em breve: pagamento via Asaas. Por enquanto, fale com o suporte para ativar seu plano.')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Status atual */}
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A3A6E)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            {status === 'active' ? <Crown className="size-5 text-[#F59E0B]" /> : <Clock className="size-5 text-[#93AAFF]" />}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{STATUS_LABEL[status] ?? status}</p>
            <p className="text-xs text-white/50">
              {status === 'trial' && diasTrial > 0 ? `Restam ${diasTrial} dias de teste grátis`
                : planoAtual ? `Plano ${PLANS.find(p => p.key === planoAtual)?.label ?? planoAtual}`
                : 'Escolha um plano abaixo'}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          Escolha seu plano ideal
        </h2>
        <p className="text-sm text-[#8C8880] mt-1">Planos flexíveis para o crescimento da sua ótica</p>
      </div>

      {/* Planos */}
      <div className="grid grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const Icon = plan.icon
          const atual = planoAtual === plan.key && status === 'active'
          return (
            <div key={plan.key} className="rounded-2xl p-6 flex flex-col bg-white transition-all"
              style={{
                border: plan.highlight ? '2px solid #1A56FF' : '1px solid #EAE8E1',
                boxShadow: plan.highlight ? '0 12px 32px rgba(26,86,255,0.18)' : '0 8px 24px rgba(13,38,76,0.08)',
              }}>
              {plan.badge && (
                <div className="self-start mb-3 px-2.5 py-1 rounded-full text-[9px] font-black text-white"
                  style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif', letterSpacing: '1.5px' }}>
                  {plan.badge}
                </div>
              )}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: plan.highlight ? '#EEF2FF' : '#F7F6F3' }}>
                  <Icon className="size-5 text-[#1A56FF]" strokeWidth={1.5} />
                </div>
                <span className="text-base font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{plan.label}</span>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-[#8C8880]">R$</span>
                  <span className="text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{plan.price}</span>
                  <span className="text-sm text-[#8C8880]">/mês</span>
                </div>
                <p className="text-xs text-[#8C8880] mt-1 leading-relaxed">{plan.desc}</p>
              </div>
              <div className="space-y-2.5 flex-1 mb-5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#E6F9F3] flex items-center justify-center shrink-0">
                      <Check className="size-2.5 text-[#0DB57A]" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-[#2E2D29]">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => assinar(plan.key)} disabled={!!loading || atual}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{
                  fontFamily: 'Barlow, sans-serif',
                  background: plan.highlight ? 'linear-gradient(135deg,#1A56FF,#1445DD)' : '#F7F6F3',
                  color: plan.highlight ? 'white' : '#1A56FF',
                  boxShadow: plan.highlight ? '0 4px 16px rgba(26,86,255,0.35)' : 'none',
                }}>
                {loading === plan.key ? <Loader2 className="size-4 animate-spin" />
                  : atual ? 'Plano atual'
                  : <>Assinar Agora <ArrowRight className="size-4" /></>}
              </button>
            </div>
          )
        })}
      </div>
      <p className="text-center text-xs text-[#C8C5BB]">Todos os planos incluem 14 dias de teste grátis. Cancele quando quiser.</p>
    </div>
  )
}
