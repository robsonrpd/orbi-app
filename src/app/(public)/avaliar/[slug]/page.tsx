import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AvaliarClient } from './avaliar-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AvaliarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = createServiceClient()
  const { data: company } = await service
    .from('companies').select('name, slug').eq('slug', slug).single()

  if (!company) notFound()

  return <AvaliarClient slug={company.slug} companyName={company.name} />
}
