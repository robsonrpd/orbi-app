import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { ClientesClient } from './clientes-client'

export default async function ClientesPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

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
