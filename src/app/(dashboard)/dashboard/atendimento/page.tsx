import { Topbar } from '@/components/orbi/topbar'
import { obterAtendimento } from '@/lib/actions/atendimento'
import { AtendimentoClient } from './atendimento-client'

export default async function AtendimentoPage() {
  const { fluxo, sla } = await obterAtendimento()

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Atendimento Automático" subtitle="Primeiro contato automático e alerta de lead sem resposta" />
      <div className="flex-1 overflow-y-auto p-6">
        <AtendimentoClient fluxoInicial={fluxo} slaInicial={sla} />
      </div>
    </div>
  )
}
