import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Nichos } from '@/components/landing/nichos'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { FAQ } from '@/components/landing/faq'
import { CTA } from '@/components/landing/cta'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Orbi — Gestão 360° com IA para óticas, salões, lojas e clínicas',
  description: 'O sistema que trabalha enquanto você descansa. Agendamentos, CRM, financeiro, estoque e atendimento automático no WhatsApp com IA. Teste grátis por 14 dias.',
  keywords: ['gestão para óticas', 'sistema para óticas', 'CRM WhatsApp', 'IA no WhatsApp', 'agenda online', 'sistema para barbearia', 'sistema para clínica', 'ERP pequenos negócios'],
  alternates: { canonical: 'https://www.orbisistem.com.br/' },
  openGraph: {
    title: 'Orbi — Gestão 360° com IA para o seu negócio',
    description: 'Agendamentos, CRM, financeiro e atendimento automático no WhatsApp com IA. Teste grátis por 14 dias, sem cartão de crédito.',
    url: 'https://www.orbisistem.com.br/',
    siteName: 'Orbi',
    images: [{ url: '/brand/Fundo.png', width: 1536, height: 1024, alt: 'Orbi — Gestão 360° para o seu negócio' }],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orbi — Gestão 360° com IA para o seu negócio',
    description: 'Agendamentos, CRM, financeiro e atendimento automático no WhatsApp com IA. Teste grátis por 14 dias.',
    images: ['/brand/Fundo.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Orbi',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Sistema de gestão 360° com IA para óticas, salões, lojas e clínicas — agendamentos, CRM, financeiro, estoque e atendimento automático no WhatsApp.',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'BRL',
    lowPrice: '97',
    highPrice: '297',
    offerCount: '3',
  },
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Nichos />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
