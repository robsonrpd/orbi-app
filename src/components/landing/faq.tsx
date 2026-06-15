'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. Você tem 14 dias grátis em qualquer plano, sem precisar cadastrar cartão de crédito.',
  },
  {
    q: 'O Orbi funciona no celular?',
    a: 'Sim. O painel é responsivo e pode ser adicionado à tela inicial do seu celular (Android ou iPhone), funcionando como um aplicativo.',
  },
  {
    q: 'A IA realmente atende meus clientes pelo WhatsApp?',
    a: 'Sim. Você conecta o WhatsApp da sua loja e a IA responde dúvidas, agenda horários e, quando necessário, avisa que um atendimento precisa de um humano.',
  },
  {
    q: 'O Orbi serve para o meu tipo de negócio?',
    a: 'O Orbi se adapta a óticas, barbearias e salões, lojas/varejo e clínicas/estética — mostrando apenas os módulos que fazem sentido para o seu ramo.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem multa e sem burocracia. Você pode cancelar diretamente pelo painel ou falando com a gente.',
  },
  {
    q: 'Meus dados e os dados dos meus clientes estão seguros?',
    a: 'Sim. Cada empresa tem seus dados completamente isolados, com permissões e criptografia, seguindo boas práticas de segurança.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#F7F6F3]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[3px] uppercase text-[#1A56FF] mb-3" style={{ fontFamily: 'Barlow, sans-serif' }}>
            Dúvidas frequentes
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Perguntas frequentes
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="rounded-2xl border border-[#EAE8E1] bg-white overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="text-sm sm:text-base font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{item.q}</span>
                  <ChevronDown className={`size-5 shrink-0 text-[#8C8880] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-[#8C8880] leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
