import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { AvaliacoesClient } from './avaliacoes-client'

export default async function AvaliacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()

  let reviews: unknown[] = []
  try {
    const { data } = await service.from('reviews' as never).select('*, contacts(name, phone)')
      .eq('company_id', userData?.company_id).order('created_at', { ascending: false })
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
