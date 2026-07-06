import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardNicho } from '@/lib/auth/nicho'
import { Topbar } from '@/components/orbi/topbar'
import { BookingLinkCard } from '@/components/orbi/booking-link-card'
import { getSiteConfig } from '@/lib/actions/site'
import { MeuSiteClient } from './meu-site-client'

export default async function MeuSitePage() {
  await guardNicho('/dashboard/meu-site')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()
  const [{ data: company }, { data: services }] = await Promise.all([
    service.from('companies').select('slug, name').eq('id', companyId).single(),
    service.from('services').select('id, name, price').eq('company_id', companyId).eq('active', true).order('name'),
  ])
  const site = await getSiteConfig()

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Meu Site" subtitle="A página pública que seus clientes acessam para agendar" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {company?.slug && <BookingLinkCard slug={company.slug} />}
        <MeuSiteClient initial={site} companyName={company?.name ?? ''} services={services ?? []} slug={company?.slug ?? ''} />
      </div>
    </div>
  )
}
