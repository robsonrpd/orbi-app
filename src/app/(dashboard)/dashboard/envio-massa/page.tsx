import { guardModo } from '@/lib/auth/modo'
import { Topbar } from '@/components/orbi/topbar'
import { obterBroadcastAtivo, listarHistoricoBroadcasts, listarOrigensDeContatos } from '@/lib/actions/broadcast'
import { EnvioMassaClient } from './envio-massa-client'

export default async function EnvioMassaPage() {
  await guardModo('envio_massa')

  const [ativo, historico, origens] = await Promise.all([
    obterBroadcastAtivo(),
    listarHistoricoBroadcasts(),
    listarOrigensDeContatos(),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Envio em Massa" subtitle="Mande uma mensagem pro WhatsApp de vários clientes de uma vez, com segurança" />
      <div className="flex-1 overflow-y-auto p-6">
        <EnvioMassaClient ativoInicial={ativo} historicoInicial={historico} origens={origens} />
      </div>
    </div>
  )
}
