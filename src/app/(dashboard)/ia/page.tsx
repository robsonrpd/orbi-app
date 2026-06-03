import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { IAConfigForm } from './ia-config-form'

export default async function IAPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const { data: company } = await service.from('companies').select('*').eq('id', companyId).single()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Inteligência IA" subtitle="Configure como o assistente responde no WhatsApp" />
      <div className="flex-1 overflow-y-auto p-6">
        <IAConfigForm company={company} />
      </div>
    </div>
  )
}
