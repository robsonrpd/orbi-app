import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { ReceitasClient } from './receitas-client'

export default async function ReceitasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

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
