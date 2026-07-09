// Etapas do funil de leads (Kanban). A ordem aqui define a ordem das colunas.
// Cada empresa pode personalizar suas próprias colunas (ver src/lib/actions/funil-colunas.ts) —
// isto aqui é só o PADRÃO usado quando a empresa ainda não personalizou nada.

export type FunilColuna = { key: string; label: string; cor: string; bg: string }

export const FUNIL_ETAPAS: FunilColuna[] = [
  { key: 'novo', label: 'Novo Lead', cor: '#1A56FF', bg: '#EEF2FF' },
  { key: 'atendimento', label: 'Em Atendimento', cor: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'orcamento', label: 'Orçamento', cor: '#F59E0B', bg: '#FEF3C7' },
  { key: 'negociacao', label: 'Negociação', cor: '#EC4899', bg: '#FCE7F3' },
  { key: 'convertido', label: 'Convertido', cor: '#0DB57A', bg: '#E6F9F3' },
  { key: 'perdido', label: 'Perdido', cor: '#EF4444', bg: '#FEF2F2' },
]

export const FUNIL_KEYS = FUNIL_ETAPAS.map(e => e.key)
export const FUNIL_DEFAULT = 'novo'

// Paleta curada pro seletor de cor ao personalizar colunas (cor do texto/ícone + fundo claro).
export const PALETA_CORES_FUNIL: { cor: string; bg: string }[] = [
  { cor: '#1A56FF', bg: '#EEF2FF' }, // azul
  { cor: '#8B5CF6', bg: '#F5F3FF' }, // roxo
  { cor: '#EC4899', bg: '#FCE7F3' }, // rosa
  { cor: '#F59E0B', bg: '#FEF3C7' }, // laranja
  { cor: '#0DB57A', bg: '#E6F9F3' }, // verde
  { cor: '#EF4444', bg: '#FEF2F2' }, // vermelho
  { cor: '#06B6D4', bg: '#ECFEFF' }, // ciano
  { cor: '#D97706', bg: '#FFF7ED' }, // âmbar
  { cor: '#7C3AED', bg: '#F3E8FF' }, // violeta
  { cor: '#8C8880', bg: '#F1F0EC' }, // cinza
]
