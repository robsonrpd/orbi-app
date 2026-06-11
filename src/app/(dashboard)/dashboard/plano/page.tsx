import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { PlanoClient } from './plano-client'

export default async function PlanoPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()
  const { data: company } = await service
    .from('companies')
    .select('subscription_status, subscription_plan, trial_ends_at')
    .eq('id', companyId)
    .single()

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Seu Plano" subtitle="Escolha o plano ideal para a sua ótica" />
      <div className="flex-1 overflow-y-auto p-6">
        <PlanoClient
          status={company?.subscription_status ?? 'trial'}
          planoAtual={company?.subscription_plan ?? null}
          trialEndsAt={company?.trial_ends_at ?? null}
        />
      </div>
    </div>
  )
}
