import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { BookingLinkCard } from '@/components/orbi/booking-link-card'
import { GlowCard } from '@/components/orbi/glow-card'
import { Sparkles, Palette, Image as ImageIcon, Type } from 'lucide-react'

export default async function MeuSitePage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()
  const { data: company } = await service.from('companies').select('slug').eq('id', companyId).single()

  const proximidades = [
    { icon: Palette, label: 'Cores e estilo', desc: 'Escolha a paleta que combina com a sua marca.' },
    { icon: Type, label: 'Textos com IA', desc: 'Descreva seu negócio e a IA escreve a página pra você.' },
    { icon: ImageIcon, label: 'Fotos do seu negócio', desc: 'Suba fotos reais do espaço, equipe e trabalhos.' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Meu Site" subtitle="A página pública que seus clientes acessam para agendar" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {company?.slug && <BookingLinkCard slug={company.slug} />}

        <GlowCard>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4 text-[#1A56FF]" />
              <p className="text-xs font-bold tracking-[2px] uppercase text-[#1A56FF]" style={{ fontFamily: 'Barlow, sans-serif' }}>
                Em breve
              </p>
            </div>
            <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
              Personalize sua página com IA
            </h2>
            <p className="text-sm text-[#8C8880] mt-2 leading-relaxed max-w-lg">
              Em breve você vai poder transformar essa página pública num site só seu — com as cores,
              fotos e o jeito de falar do seu negócio. Basta descrever numa frase como você quer, e a IA monta pra você.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              {proximidades.map(p => (
                <div key={p.label} className="rounded-xl border border-[#EAE8E1] p-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: '#EEF2FF' }}>
                    <p.icon className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-bold text-[#1C1B18]">{p.label}</p>
                  <p className="text-xs text-[#8C8880] mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  )
}
