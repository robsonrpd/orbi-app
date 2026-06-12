'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { salvarNicho } from '@/lib/actions/empresa'
import { NICHOS, NICHO_DEFAULT } from '@/lib/nichos'
import { Check, Loader2, Store } from 'lucide-react'

export function NichoSelector({ atual }: { atual: string | null }) {
  const [sel, setSel] = useState(atual ?? NICHO_DEFAULT)
  const [loading, setLoading] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function escolher(key: string) {
    if (key === sel || loading) return
    const anterior = sel
    setSel(key); setLoading(key); setError(null); setSalvo(false)
    const r = await salvarNicho(key)
    setLoading(null)
    if (r?.error) { setSel(anterior); setError(r.error); return }
    setSalvo(true); setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <GlowCard>
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
            <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Ramo do negócio</h2>
          </div>
          {salvo && <span className="flex items-center gap-1 text-xs font-bold text-[#0DB57A]"><Check className="size-3.5" /> Salvo</span>}
        </div>
        <p className="text-xs text-[#8C8880] mb-4">Define quais módulos aparecem no sistema. Você pode mudar quando quiser.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {NICHOS.map(n => {
            const ativo = sel === n.key
            return (
              <button key={n.key} onClick={() => escolher(n.key)} disabled={!!loading}
                className="text-left rounded-xl border-2 p-3 transition-all relative disabled:opacity-70"
                style={{ borderColor: ativo ? '#1A56FF' : '#EAE8E1', background: ativo ? '#EEF2FF' : '#fff' }}>
                {loading === n.key && <Loader2 className="size-4 animate-spin text-[#1A56FF] absolute top-2 right-2" />}
                {ativo && loading !== n.key && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1A56FF] flex items-center justify-center">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </span>
                )}
                <div className="text-2xl mb-1">{n.emoji}</div>
                <p className="text-sm font-bold text-[#1C1B18]">{n.label}</p>
                <p className="text-[11px] text-[#8C8880] mt-0.5 leading-snug">{n.descricao}</p>
              </button>
            )
          })}
        </div>
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>
    </GlowCard>
  )
}
