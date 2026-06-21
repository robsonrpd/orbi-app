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

  if ('error' in info) notFound()

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
