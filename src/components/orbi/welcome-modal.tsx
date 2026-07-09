'use client'

import { useState, useEffect } from 'react'
import { Eye, Calendar, MessageSquare, DollarSign, Users, Check, X, ArrowRight, Zap } from 'lucide-react'

type Props = {
  companyName: string
  trialEndsAt: string
  onClose: () => void
}

const plans = [
  {
    key: 'individual',
    label: 'Individual',
    price: 97,
    desc: '1 usuário',
    highlight: false,
  },
  {
    key: 'equipe',
    label: 'Equipe',
    price: 197,
    desc: 'Até 3 acessos',
    highlight: true,
  },
  {
    key: 'ilimitado',
    label: 'Ilimitado',
    price: 297,
    desc: 'Sem limite',
    highlight: false,
  },
]

const features = [
  { icon: Calendar, text: 'Agendamentos online 24/7' },
  { icon: MessageSquare, text: 'WhatsApp integrado ao CRM' },
  { icon: DollarSign, text: 'Cobranças e financeiro' },
  { icon: Users, text: 'CRM completo de clientes' },
]

export function WelcomeModal({ companyName, trialEndsAt, onClose }: Props) {
  const trialDate = new Date(trialEndsAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ))

  const [selectedPlan, setSelectedPlan] = useState('equipe')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex shadow-2xl"
        style={{ background: '#0D1635', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Lado esquerdo — visual */}
        <div className="w-44 shrink-0 relative overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #0A0F1E 0%, #0D1635 100%)' }}>

          {/* Textura */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

          {/* Blob */}
          <div className="absolute top-4 left-4 w-24 h-24 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #1A56FF, transparent)' }} />

          {/* Logo + ícone grande */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: '#1A56FF', boxShadow: '0 0 32px rgba(26,86,255,0.6)' }}>
              <Eye className="size-8 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-black text-white text-center"
              style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
              Orbi<span style={{ color: '#1A56FF' }}>.</span>
            </span>
            <div className="mt-2 px-3 py-1.5 rounded-full text-[10px] font-bold text-center"
              style={{ background: 'rgba(13,181,122,0.2)', color: '#0DB57A', border: '1px solid rgba(13,181,122,0.3)', fontFamily: 'Barlow, sans-serif', letterSpacing: '1px' }}>
              CONTA ATIVADA
            </div>
          </div>
        </div>

        {/* Lado direito — conteúdo */}
        <div className="flex-1 p-7 relative">
          {/* Fechar */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all">
            <X className="size-4" />
          </button>

          {/* Título */}
          <div className="mb-5">
            <h2 className="text-2xl font-black text-white leading-tight"
              style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
              Bem-vindo ao trial<br />
              <span style={{
                backgroundImage: 'linear-gradient(90deg, #1A56FF, #93AAFF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                de {daysLeft} dias
              </span>
            </h2>
            <p className="text-sm text-white/40 mt-1.5">
              Seu acesso completo está liberado até{' '}
              <span className="text-white/70 font-semibold">{trialDate}</span>.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(26,86,255,0.2)' }}>
                  <f.icon className="size-3.5 text-[#93AAFF]" strokeWidth={1.5} />
                </div>
                <span className="text-xs text-white/60">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Planos */}
          <div className="rounded-xl p-4 mb-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] mb-3"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              Planos após o período grátis
            </p>
            <div className="grid grid-cols-3 gap-2">
              {plans.map(p => (
                <button key={p.key} onClick={() => setSelectedPlan(p.key)}
                  className="rounded-xl p-3 text-center transition-all"
                  style={{
                    background: selectedPlan === p.key
                      ? p.highlight ? '#1A56FF' : 'rgba(26,86,255,0.2)'
                      : 'rgba(255,255,255,0.04)',
                    border: selectedPlan === p.key
                      ? p.highlight ? '1px solid #1A56FF' : '1px solid rgba(26,86,255,0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <p className="text-xs font-semibold text-white/70 mb-1"
                    style={{ fontFamily: 'Barlow, sans-serif' }}>{p.label}</p>
                  <p className="text-lg font-black text-white leading-none"
                    style={{ fontFamily: 'Fraunces, serif' }}>
                    R${p.price}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">{p.desc}</p>
                  {p.highlight && (
                    <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white"
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      POPULAR
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button onClick={onClose}
            className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{
              fontFamily: 'Barlow, sans-serif',
              background: 'linear-gradient(135deg, #1A56FF, #1445DD)',
              boxShadow: '0 4px 20px rgba(26,86,255,0.4)'
            }}>
            Entrar no painel <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
