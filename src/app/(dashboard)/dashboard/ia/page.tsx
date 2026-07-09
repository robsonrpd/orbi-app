import { Topbar } from '@/components/orbi/topbar'
import { WhatsappConnect } from '@/components/orbi/whatsapp-connect'
import { statusWhatsApp } from '@/lib/actions/whatsapp'

export default async function IAPage() {
  const wa = await statusWhatsApp()

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Conexão WhatsApp" subtitle="Conecte o WhatsApp da sua loja pra receber as mensagens no Conversas" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg">
          <WhatsappConnect stateInicial={wa.state} />
        </div>
      </div>
    </div>
  )
}
