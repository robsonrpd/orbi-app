'use client'

import { useState } from 'react'
import { X, HelpCircle, MessageCircle, ChevronDown, Settings, CreditCard, Gift } from 'lucide-react'

const faqs = [
  {
    icon: Settings,
    q: 'Como configurar meu negócio pela primeira vez?',
    a: 'Vá em Funcionamento para definir os dias/horários de atendimento, depois em Serviços para cadastrar o que você oferece. Por fim, conecte seu WhatsApp em OrbiWhatsapp → Conexão WhatsApp.',
  },
  {
    icon: CreditCard,
    q: 'Como funciona a cobrança do plano?',
    a: 'Você tem 14 dias de teste grátis. Depois disso, a cobrança é mensal e pode ser feita pelo WhatsApp com nosso suporte, em Seu Plano.',
  },
  {
    icon: Gift,
    q: 'Como funciona o programa de indicação?',
    a: 'Em "Ganhe uma Mensalidade" você encontra seu link de indicação. Cada novo cliente que assinar por ele te dá benefícios na mensalidade.',
  },
]

export function CentralSuporteModal({ onClose }: { onClose: () => void }) {
  const [aberto, setAberto] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.6)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE8E1] shrink-0"
          style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A3A6E)' }}>
          <div className="flex items-center gap-2 text-white">
            <HelpCircle className="size-4.5" />
            <h2 className="text-sm font-bold">Central de Suporte</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-4.5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3">
          <p className="text-xs font-bold text-[#8C8880] uppercase tracking-wider">Dúvidas frequentes</p>
          {faqs.map((f, i) => {
            const isOpen = aberto === i
            return (
              <div key={f.q} className="rounded-xl border border-[#EAE8E1] overflow-hidden">
                <button onClick={() => setAberto(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <f.icon className="size-4 text-[#1A56FF] shrink-0" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-[#1C1B18] flex-1">{f.q}</span>
                  <ChevronDown className={`size-4 text-[#8C8880] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="px-4 pb-3 text-sm text-[#8C8880] leading-relaxed">{f.a}</p>}
              </div>
            )
          })}
        </div>

        <div className="p-5 border-t border-[#EAE8E1] shrink-0">
          <a href="https://wa.me/5585999035302?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20Orbi."
            target="_blank" rel="noopener noreferrer"
            className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: '#25D366' }}>
            <MessageCircle className="size-4" /> Entrar em contato
          </a>
        </div>
      </div>
    </div>
  )
}
