import { notFound } from 'next/navigation'
import { getBookingInfo } from '@/lib/actions/public-booking'
import { AgendarClient } from './agendar-client'

// Sempre busca os dados na hora — sem isso, o Next renderiza essa página
// estaticamente e o horário/serviços salvos no painel nunca aparecem aqui.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const info = await getBookingInfo(slug)

  if ('error' in info) {
    if ('desativada' in info) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 text-center" style={{ background: '#F7F6F3' }}>
          <div>
            <p className="text-4xl mb-3">🔒</p>
            <h1 className="text-lg font-bold text-[#1C1B18]">Página de agendamento indisponível</h1>
            <p className="text-sm text-[#8C8880] mt-1">Entre em contato diretamente com o estabelecimento.</p>
          </div>
        </div>
      )
    }
    notFound()
  }

  return (
    <AgendarClient
      slug={slug}
      companyId={info.companyId}
      companyName={info.companyName}
      logoUrl={info.logoUrl}
      services={info.services}
      schedule={info.schedule}
      avaliacoes={info.avaliacoes}
      mediaAvaliacao={info.mediaAvaliacao}
      site={info.site}
    />
  )
}
