import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { ClientesClient } from './clientes-client'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const { data: contacts } = await service
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Clientes" subtitle={`${contacts?.length ?? 0} clientes cadastrados`} />
      <div className="flex-1 overflow-y-auto p-6">
        <ClientesClient contacts={contacts ?? []} />
      </div>
    </div>
  )
}
