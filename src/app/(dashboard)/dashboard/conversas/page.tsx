import { Suspense } from 'react'
import { Topbar } from '@/components/orbi/topbar'
import { listarConversas } from '@/lib/actions/conversas'
import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { ConversasClient } from './conversas-client'

export default async function ConversasPage() {
  const [conversas, companyId] = await Promise.all([listarConversas(), getEffectiveCompanyId()])
  const { data: loja } = companyId
    ? await createServiceClient().from('companies').select('name').eq('id', companyId).single()
    : { data: null }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Conversas" subtitle="Todas as conversas do WhatsApp em um só lugar" />
      <div className="flex-1 overflow-hidden p-2 md:p-4">
        <Suspense>
          <ConversasClient conversasIniciais={conversas} lojaNome={(loja?.name as string | undefined)?.trim() || 'Loja'} />
        </Suspense>
      </div>
    </div>
  )
}
