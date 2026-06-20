// Configuração central de nichos (ramos de negócio).
// Cada nicho define quais MÓDULOS de menu ficam escondidos (os que não fazem sentido pra ele).
// Módulo é identificado pelo href do menu — mesmo padrão de src/lib/permissoes.ts.

export type Nicho = {
  key: string
  label: string
  emoji: string
  descricao: string
  esconder: string[] // hrefs de menu ocultados neste nicho
}

export const NICHOS: Nicho[] = [
  {
    key: 'otica', label: 'Ótica', emoji: '👓',
    descricao: 'Óculos, lentes, receitas e laboratório.',
    esconder: [],
  },
  {
    key: 'barbearia', label: 'Barbearia / Salão', emoji: '💈',
    descricao: 'Agenda, serviços, comissão e produtos.',
    esconder: ['/dashboard/receitas', '/dashboard/ordens-servico'],
  },
  {
    key: 'loja', label: 'Loja / Varejo', emoji: '🛍️',
    descricao: 'Estoque, PDV, crediário e clientes.',
    esconder: ['/dashboard/receitas', '/dashboard/ordens-servico'],
  },
  {
    key: 'clinica', label: 'Clínica / Estética', emoji: '🩺',
    descricao: 'Agendamentos, serviços e ficha de clientes.',
    esconder: ['/dashboard/receitas', '/dashboard/ordens-servico'],
  },
]

export const NICHO_DEFAULT = 'otica'

export const NICHO_KEYS = NICHOS.map(n => n.key)

/** Hrefs de menu que devem ficar ocultos para o nicho informado. */
export function nichoEsconde(businessType: string | null | undefined): string[] {
  const n = NICHOS.find(x => x.key === (businessType ?? NICHO_DEFAULT))
  return n?.esconder ?? []
}

export function nichoLabel(businessType: string | null | undefined): string {
  return NICHOS.find(x => x.key === (businessType ?? NICHO_DEFAULT))?.label ?? 'Negócio'
}

// Sugestões rápidas de serviços por ramo
export const SUGESTOES_SERVICO: Record<string, string[]> = {
  otica: ['Consulta de óculos', 'Ajuste de armação', 'Troca de lentes', 'Exame de vista', 'Limpeza de óculos', 'Montagem de óculos', 'Adaptação de lente de contato', 'Revisão de óculos'],
  barbearia: ['Corte de cabelo', 'Barba', 'Corte + Barba', 'Sobrancelha', 'Pezinho', 'Hidratação', 'Coloração', 'Escova / Progressiva', 'Luzes / Mechas', 'Corte infantil', 'Manicure', 'Pedicure'],
  clinica: ['Limpeza de pele', 'Massagem relaxante', 'Drenagem linfática', 'Depilação', 'Design de sobrancelha', 'Peeling', 'Avaliação', 'Microagulhamento', 'Botox / Preenchimento', 'Massagem modeladora'],
  loja: ['Montagem / Entrega', 'Assistência técnica', 'Garantia estendida', 'Instalação'],
}

export function sugestoesServico(businessType: string | null | undefined): string[] {
  return SUGESTOES_SERVICO[businessType ?? NICHO_DEFAULT] ?? SUGESTOES_SERVICO.otica
}
