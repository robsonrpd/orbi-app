import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { IndicacoesClient } from './indicacoes-client'

export default async function IndicacoesPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  let indicacoes: unknown[] = []
  try {
    const { data } = await service.from('indicacoes' as never).select('*')
      .eq('company_id', companyId).order('created_at', { ascending: false })
    indicacoes = data ?? []
  } catch { indicacoes = [] }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Ganhe uma Mensalidade" subtitle="Indique outra ótica e ganhe desconto na sua mensalidade" />
      <div className="flex-1 overflow-y-auto p-6">
        <IndicacoesClient indicacoes={indicacoes as never} />
      </div>
    </div>
  )
}
