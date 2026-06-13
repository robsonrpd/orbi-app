import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { FunilClient } from './funil-client'

type Msg = { role: string; content: string }

export default async function FunilPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: contacts }, { data: convs }] = await Promise.all([
    service.from('contacts')
      .select('id, name, phone, email, origem, tags, notes, funil_etapa, funil_valor, created_at')
      .eq('company_id', companyId).eq('active', true).order('created_at', { ascending: false }),
    service.from('conversations').select('id, numero, messages, last_message_at').eq('company_id', companyId),
  ])

  // mapa de conversa por últimos 8 dígitos do número
  const convPorChave = new Map<string, { id: string; messages: Msg[]; last_message_at: string }>()
  for (const c of convs ?? []) {
    const k = (c.numero ?? '').replace(/\D/g, '').slice(-8)
    if (k) convPorChave.set(k, { id: c.id as string, messages: (c.messages as Msg[]) ?? [], last_message_at: c.last_message_at as string })
  }

  const leads = (contacts ?? []).map(l => {
    const k = (l.phone ?? '').replace(/\D/g, '').slice(-8)
    const conv = k ? convPorChave.get(k) : undefined
    return { ...l, conversaId: conv?.id ?? null, messages: conv?.messages ?? [], lastMessageAt: conv?.last_message_at ?? null }
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Funil de Leads" subtitle="Seu CRM — acompanhe e converse com cada lead" />
      <div className="flex-1 overflow-hidden p-6">
        <FunilClient leads={leads as never} />
      </div>
    </div>
  )
}
