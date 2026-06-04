import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { FinanceiroRedesignClient } from './financeiro-redesign-client'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id, companies(slug)').eq('id', user!.id).single()
  const companyId = userData?.company_id
  const companySlug = (userData?.companies as { slug?: string } | null)?.slug ?? 'minha-otica'

  const [{ data: transactions }, { data: contacts }] = await Promise.all([
    service.from('transactions').select('id, amount, status, due_date, created_at, notes, contacts(id, name, phone)')
      .eq('company_id', companyId).order('created_at', { ascending: false }),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Financeiro" subtitle="Controle de cobranças e recebimentos" />
      <div className="flex-1 overflow-y-auto p-6">
        <FinanceiroRedesignClient
          transactions={(transactions ?? []) as never}
          contacts={contacts ?? []}
          companySlug={companySlug}
        />
      </div>
    </div>
  )
}
