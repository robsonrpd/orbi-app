import { Suspense } from 'react'
import { Topbar } from '@/components/orbi/topbar'
import { listarConversas } from '@/lib/actions/conversas'
import { ConversasClient } from './conversas-client'

export default async function ConversasPage() {
  const conversas = await listarConversas()

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Conversas" subtitle="Todas as conversas do WhatsApp em um só lugar" />
      <div className="flex-1 overflow-hidden p-4">
        <Suspense>
          <ConversasClient conversasIniciais={conversas} />
        </Suspense>
      </div>
    </div>
  )
}
