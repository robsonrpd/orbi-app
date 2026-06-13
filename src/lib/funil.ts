// Etapas do funil de leads (Kanban). A ordem aqui define a ordem das colunas.
export const FUNIL_ETAPAS = [
  { key: 'novo', label: 'Novo Lead', cor: '#1A56FF', bg: '#EEF2FF' },
  { key: 'atendimento', label: 'Em Atendimento', cor: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'orcamento', label: 'Orçamento', cor: '#F59E0B', bg: '#FEF3C7' },
  { key: 'negociacao', label: 'Negociação', cor: '#EC4899', bg: '#FCE7F3' },
  { key: 'convertido', label: 'Convertido', cor: '#0DB57A', bg: '#E6F9F3' },
  { key: 'perdido', label: 'Perdido', cor: '#EF4444', bg: '#FEF2F2' },
] as const

export const FUNIL_KEYS = FUNIL_ETAPAS.map(e => e.key) as string[]
export const FUNIL_DEFAULT = 'novo'
