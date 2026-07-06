import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardModo } from '@/lib/auth/modo'
import { guardNicho } from '@/lib/auth/nicho'
import { Topbar } from '@/components/orbi/topbar'
import { CaixaClient } from './caixa-client'

export default async function CaixaPage() {
  await guardNicho('/dashboard/caixa')
  await guardModo('caixa')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const { data: caixaAberto } = await service
    .from('caixas').select('*').eq('company_id', companyId).eq('status', 'aberto').limit(1).single()

  let movimentos: unknown[] = []
  if (caixaAberto) {
    const { data } = await service.from('caixa_movimentos').select('*')
      .eq('caixa_id', caixaAberto.id).order('created_at', { ascending: false })
    movimentos = data ?? []
  }

  const { data: historico } = await service
    .from('caixas').select('*').eq('company_id', companyId).eq('status', 'fechado')
    .order('fechado_em', { ascending: false }).limit(10)

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Caixa" subtitle="Abertura, movimentação e fechamento de caixa" />
      <div className="flex-1 overflow-y-auto p-6">
        <CaixaClient
          caixaAberto={(caixaAberto ?? null) as never}
          movimentos={movimentos as never}
          historico={(historico ?? []) as never}
        />
      </div>
    </div>
  )
}
