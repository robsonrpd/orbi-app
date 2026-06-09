import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { VendedoresClient } from './vendedores-client'

export default async function VendedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()

  const { data: vendedores } = await service
    .from('vendedores').select('*')
    .eq('company_id', userData?.company_id).eq('active', true).order('created_at')

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Vendedores" subtitle="Equipe de vendas e comissões" />
      <div className="flex-1 overflow-y-auto p-6">
        <VendedoresClient vendedores={(vendedores ?? []) as never} />
      </div>
    </div>
  )
}
