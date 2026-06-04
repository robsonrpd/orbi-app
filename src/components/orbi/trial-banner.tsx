'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'

type Props = {
  daysLeft: number
  onVerPlanos: () => void
}

export function TrialBanner({ daysLeft, onVerPlanos }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const isUrgent = daysLeft <= 3
  const isWarning = daysLeft <= 7

  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm shrink-0"
      style={{
        background: isUrgent ? 'linear-gradient(90deg, #7F1D1D, #991B1B)' :
          isWarning ? 'linear-gradient(90deg, #78350F, #92400E)' :
          'linear-gradient(90deg, #0A0F1E, #0D1635)',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
      <div className="flex items-center gap-2">
        <Zap className="size-3.5 text-[#93AAFF] shrink-0" strokeWidth={2} fill="currentColor" />
        <span className="text-white/80 text-xs">
          {isUrgent
            ? <><span className="text-red-300 font-bold">⚠️ Atenção!</span> Seu trial expira em <span className="font-bold text-white">{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</span> — assine agora para não perder o acesso.</>
            : <>Teste grátis: <span className="font-semibold text-white">{daysLeft} dias restantes</span> — conheça os planos antes que acabe.</>
          }
        </span>
        <button onClick={onVerPlanos}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-90 ml-1"
          style={{
            fontFamily: 'Barlow, sans-serif',
            background: '#1A56FF',
            color: 'white',
            letterSpacing: '0.3px'
          }}>
          → Ver Planos
        </button>
      </div>
      <button onClick={() => setDismissed(true)}
        className="text-white/30 hover:text-white/70 transition-colors ml-4">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
