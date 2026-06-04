import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { FuncionamentoClient } from './funcionamento-client'

export default async function FuncionamentoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const { data: company } = await service.from('companies').select('settings').eq('id', userData?.company_id).single()

  const settings = company?.settings as { schedule?: Record<string, { open: string; close: string; active: boolean }>; interval_minutes?: number } | null

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Horário de Funcionamento" subtitle="Configure quando sua ótica atende" />
      <div className="flex-1 overflow-y-auto p-6">
        <FuncionamentoClient
          initialSchedule={settings?.schedule ?? {}}
          initialInterval={settings?.interval_minutes ?? 30}
        />
      </div>
    </div>
  )
}
