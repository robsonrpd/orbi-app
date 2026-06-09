import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { OSClient } from './os-client'

export default async function OrdensServicoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const [{ data: ordens }, { data: contacts }, { data: services }, { data: products }] = await Promise.all([
    service.from('ordens_servico').select('*, contacts(id, name, phone)')
      .eq('company_id', companyId).order('numero', { ascending: false }),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
    service.from('services').select('id, name, price').eq('company_id', companyId).eq('active', true),
    service.from('products' as never).select('id, name, price').eq('company_id', companyId).eq('active', true),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Ordens de Serviço" subtitle="Pedidos de óculos e monitor de produção" />
      <div className="flex-1 overflow-y-auto p-6">
        <OSClient
          ordens={(ordens ?? []) as never}
          contacts={contacts ?? []}
          services={(services ?? []) as never}
          products={(products ?? []) as never}
        />
      </div>
    </div>
  )
}
