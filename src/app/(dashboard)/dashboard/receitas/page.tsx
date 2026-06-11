import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { ReceitasClient } from './receitas-client'

export default async function ReceitasPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: receitas }, { data: contacts }] = await Promise.all([
    service.from('receitas').select('*, contacts(id, name, phone)')
      .eq('company_id', companyId).order('created_at', { ascending: false }),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Receitas (RX)" subtitle="Medidas ópticas dos clientes" />
      <div className="flex-1 overflow-y-auto p-6">
        <ReceitasClient receitas={(receitas ?? []) as never} contacts={contacts ?? []} />
      </div>
    </div>
  )
}
