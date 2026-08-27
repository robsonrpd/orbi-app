// Atendimento automático do primeiro contato + SLA de resposta do vendedor.
//
// Contexto de segurança (importante): o número de WhatsApp da loja já foi banido uma vez.
// O que derruba número é mandar mensagem pra quem não falou com você e repetir envios.
// Por isso o fluxo daqui só dispara em RESPOSTA a quem mandou mensagem primeiro, nunca
// reenvia uma etapa já enviada (o ponteiro fluxo_etapa garante isso) e tem teto de
// mensagens seguidas por disparo.

export type EtapaFluxo = {
  id: string
  tipo: 'mensagem' | 'pergunta'
  texto: string
  /** Só para pergunta: vira o rótulo da anotação salva no lead ("Produto: sacolas"). */
  rotulo?: string
}

export type FluxoAtendimento = {
  ativo: boolean
  etapas: EtapaFluxo[]
  /** Teto de mensagens enviadas em sequência num único disparo. */
  maxSeguidas: number
  /** Ao concluir o roteiro, entrega o lead a um vendedor pelo rodízio. */
  atribuirVendedor: boolean
}

export type SlaAtendimento = {
  ativo: boolean
  minutosAlerta: number
  minutosTransferencia: number
  avisarWhatsapp: boolean
}

export const FLUXO_PADRAO: FluxoAtendimento = {
  ativo: false,
  maxSeguidas: 4,
  atribuirVendedor: true,
  etapas: [
    { id: 'e1', tipo: 'mensagem', texto: 'Olá! Bem-vindo(a) 👋\n\nObrigado pelo contato. Vou fazer duas perguntinhas rápidas pra te atender melhor.' },
    { id: 'e2', tipo: 'pergunta', rotulo: 'Produto de interesse', texto: 'Qual produto você tem interesse?' },
    { id: 'e3', tipo: 'pergunta', rotulo: 'Quantidade', texto: 'Perfeito! E qual a quantidade que você precisa?' },
    { id: 'e4', tipo: 'mensagem', texto: '✅ Contato registrado!\n\nEm instantes um de nossos consultores dará andamento ao seu atendimento.' },
  ],
}

export const SLA_PADRAO: SlaAtendimento = {
  ativo: false,
  minutosAlerta: 30,
  minutosTransferencia: 120,
  avisarWhatsapp: true,
}

export function lerFluxo(settings: unknown): FluxoAtendimento {
  const f = (settings as { fluxo_atendimento?: Partial<FluxoAtendimento> } | null)?.fluxo_atendimento
  if (!f || !Array.isArray(f.etapas)) return FLUXO_PADRAO
  return {
    ativo: !!f.ativo,
    etapas: f.etapas,
    maxSeguidas: Math.min(Math.max(f.maxSeguidas ?? 4, 1), 6),
    atribuirVendedor: f.atribuirVendedor !== false,
  }
}

export function lerSla(settings: unknown): SlaAtendimento {
  const s = (settings as { sla_atendimento?: Partial<SlaAtendimento> } | null)?.sla_atendimento
  if (!s) return SLA_PADRAO
  return {
    ativo: !!s.ativo,
    minutosAlerta: Math.max(s.minutosAlerta ?? 30, 5),
    minutosTransferencia: Math.max(s.minutosTransferencia ?? 120, 10),
    avisarWhatsapp: s.avisarWhatsapp !== false,
  }
}

/**
 * Próximo vendedor do rodízio: o que está com menos leads em aberto.
 * Distribuir pelo menor volume é mais justo que uma fila circular, porque
 * leva em conta quem já está sobrecarregado.
 */
export function proximoDoRodizio(
  vendedores: { id: string; nome: string }[],
  cargaPorVendedor: Map<string, number>,
  excluirId?: string | null,
): { id: string; nome: string } | null {
  const elegiveis = vendedores.filter(v => v.id !== excluirId)
  if (elegiveis.length === 0) return null
  return elegiveis.reduce((menor, v) =>
    (cargaPorVendedor.get(v.id) ?? 0) < (cargaPorVendedor.get(menor.id) ?? 0) ? v : menor
  )
}
