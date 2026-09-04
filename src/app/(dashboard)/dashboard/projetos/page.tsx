import { createServiceClient } from '@/lib/supabase/server'
import { buscarTodos } from '@/lib/supabase/paginacao'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { guardNicho } from '@/lib/auth/nicho'
import { Topbar } from '@/components/orbi/topbar'
import { ProjetosClient } from './projetos-client'

export default async function ProjetosPage() {
  await guardNicho('/dashboard/projetos')
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: projetos }, contacts, { data: vendedores }] = await Promise.all([
    service.from('projetos' as never).select('*, contacts(id, name, phone)').eq('company_id', companyId).order('created_at', { ascending: false }),
    buscarTodos(
      (de, ate) => service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name').range(de, ate),
      'contatos',
    ),
    service.from('vendedores').select('id, nome').eq('company_id', companyId).eq('active', true).order('nome'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Projetos" subtitle="Kanban de projetos, prazos e responsáveis" />
      <div className="flex-1 overflow-y-auto p-6">
        <ProjetosClient
          projetos={(projetos ?? []) as never}
          contacts={contacts ?? []}
          vendedores={vendedores ?? []}
        />
      </div>
    </div>
  )
}
