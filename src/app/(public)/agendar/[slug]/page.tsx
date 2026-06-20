import { notFound } from 'next/navigation'
import { getBookingInfo } from '@/lib/actions/public-booking'
import { AgendarClient } from './agendar-client'

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
    />
  )
}
