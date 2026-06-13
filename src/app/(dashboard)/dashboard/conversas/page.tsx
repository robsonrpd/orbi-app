import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { ConversasClient } from './conversas-client'

export default async function ConversasPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  let conversas: unknown[] = []
  try {
    const { data } = await service
      .from('conversations')
      .select('id, numero, messages, handled_by_ai, escalated_at, last_message_at, contacts(name, phone)')
      .eq('company_id', companyId)
      .order('last_message_at', { ascending: false })
      .limit(80)
    conversas = data ?? []
  } catch { conversas = [] }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Conversas" subtitle="Histórico de atendimentos via WhatsApp" />
      <div className="flex-1 overflow-y-auto p-6">
        <ConversasClient conversas={conversas as never} />
      </div>
    </div>
  )
}
