import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { AvaliacoesClient } from './avaliacoes-client'

export default async function AvaliacoesPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  let reviews: unknown[] = []
  try {
    const { data } = await service.from('reviews' as never).select('*, contacts(name, phone)')
      .eq('company_id', companyId).order('created_at', { ascending: false })
    reviews = data ?? []
  } catch { reviews = [] }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Avaliações" subtitle="Visualize e gerencie as avaliações recebidas" />
      <div className="flex-1 overflow-y-auto p-6">
        <AvaliacoesClient reviews={reviews as never} />
      </div>
    </div>
  )
}
