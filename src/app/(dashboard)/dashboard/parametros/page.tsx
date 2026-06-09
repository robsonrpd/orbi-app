import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { ParametrosClient } from './parametros-client'

export default async function ParametrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const { data: company } = await service.from('companies').select('settings').eq('id', userData?.company_id).single()

  const settings = (company?.settings ?? {}) as { regras_venda?: Record<string, boolean> }
  const initial = settings.regras_venda ?? {}

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Parâmetros de Venda" subtitle="Regras de comportamento do sistema" />
      <div className="flex-1 overflow-y-auto p-6">
        <ParametrosClient initial={initial} />
      </div>
    </div>
  )
}
