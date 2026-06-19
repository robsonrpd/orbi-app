'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { Link2, Copy, Check, MessageCircle } from 'lucide-react'

export function BookingLinkCard({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const link = `${appUrl}/agendar/${slug}`

  function copiar() {
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function abrirWhatsapp() {
    const texto = encodeURIComponent(`Olá! Agende seu horário direto por aqui: ${link}`)
    window.open(`https://wa.me/?text=${texto}`, '_blank')
  }

  return (
    <GlowCard>
      <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
            <Link2 className="size-5" style={{ color: '#1A56FF' }} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1C1B18]">Link de agendamento do cliente</p>
            <p className="text-xs text-[#8C8880] truncate">{link}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={copiar}
            className="h-9 px-3.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all"
            style={{ background: copiado ? '#E6F9F3' : '#F7F6F3', color: copiado ? '#0DB57A' : '#1C1B18' }}>
            {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copiado ? 'Copiado!' : 'Copiar link'}
          </button>
          <button onClick={abrirWhatsapp}
            className="h-9 px-3.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-white transition-all"
            style={{ background: '#25D366' }}>
            <MessageCircle className="size-3.5" /> Enviar no WhatsApp
          </button>
        </div>
      </div>
    </GlowCard>
  )
}
