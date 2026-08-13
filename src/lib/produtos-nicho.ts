// Configuração do cadastro de produto por ramo de negócio.
//
// A tela de Produtos nasceu só para ótica (categorias "Ótica"/"Diversos", campo "Grife",
// tipos com NCM de lente e armação). Depois que o Orbi passou a atender outros ramos, esse
// vocabulário passou a aparecer errado — uma loja de roupa cadastrando uma camiseta via
// "Produto de Ótica". Aqui cada ramo define as próprias categorias, tipos e rótulos.

export type TipoProduto = { label: string; ncm?: string; emoji: string }

export type CategoriaProduto = {
  key: string      // gravado em products.categoria
  label: string
  desc: string
  emoji: string
  tipos: TipoProduto[]
}

export type ConfigProduto = {
  categorias: CategoriaProduto[]
  labelMarca: string
  /** Roupa e acessório vendem a mesma peça em vários tamanhos/cores, cada um com estoque próprio. */
  usaTamanhoCor: boolean
  /** Só a ótica trabalha com NCM fiscal por tipo de produto hoje. */
  usaNcm: boolean
  placeholderNome: string
}

const TIPOS_OTICA: TipoProduto[] = [
  { label: 'Lentes de cristal', ncm: '90014000', emoji: '🔍' },
  { label: 'Lentes CR39/Poli/Trivex', ncm: '90015000', emoji: '🔍' },
  { label: 'Armação de acetato', ncm: '90031100', emoji: '👓' },
  { label: 'Armação de metal', ncm: '90031910', emoji: '👓' },
  { label: 'Armação outros materiais', ncm: '90031990', emoji: '👓' },
  { label: 'Óculos de sol', ncm: '90041000', emoji: '🕶️' },
  { label: 'Óculos de correção', ncm: '90049010', emoji: '👓' },
  { label: 'Óculos de segurança', ncm: '90049020', emoji: '🥽' },
  { label: 'Limpa-lentes', ncm: '34012090', emoji: '🧴' },
  { label: 'Relógio', ncm: '90011100', emoji: '⌚' },
  { label: 'Serviços/Outros', ncm: '00000000', emoji: '📦' },
]

const TIPOS_CONVENIENCIA: TipoProduto[] = [
  { label: 'Bebida', emoji: '🥤' },
  { label: 'Alimento / Snack', emoji: '🍫' },
  { label: 'Café / Quente', emoji: '☕' },
  { label: 'Acessório', emoji: '🎒' },
  { label: 'Higiene / Limpeza', emoji: '🧴' },
  { label: 'Outro', emoji: '🛒' },
]

const TIPOS_ROUPA: TipoProduto[] = [
  { label: 'Camiseta / T-shirt', emoji: '👕' },
  { label: 'Polo', emoji: '👕' },
  { label: 'Camisa', emoji: '👔' },
  { label: 'Regata', emoji: '🎽' },
  { label: 'Calça', emoji: '👖' },
  { label: 'Bermuda / Short', emoji: '🩳' },
  { label: 'Vestido', emoji: '👗' },
  { label: 'Saia', emoji: '👗' },
  { label: 'Jaqueta / Casaco', emoji: '🧥' },
  { label: 'Moletom / Blusa de frio', emoji: '🧥' },
  { label: 'Roupa íntima', emoji: '🩲' },
  { label: 'Moda praia', emoji: '🩱' },
  { label: 'Outro', emoji: '👚' },
]

const TIPOS_ACESSORIO: TipoProduto[] = [
  { label: 'Bolsa / Mochila', emoji: '👜' },
  { label: 'Calçado', emoji: '👟' },
  { label: 'Cinto', emoji: '🪢' },
  { label: 'Boné / Chapéu', emoji: '🧢' },
  { label: 'Óculos', emoji: '🕶️' },
  { label: 'Relógio', emoji: '⌚' },
  { label: 'Bijuteria / Joia', emoji: '💍' },
  { label: 'Meia', emoji: '🧦' },
  { label: 'Carteira', emoji: '👛' },
  { label: 'Perfume / Cosmético', emoji: '🧴' },
  { label: 'Outro', emoji: '🎒' },
]

const TIPOS_BARBEARIA: TipoProduto[] = [
  { label: 'Pomada / Cera', emoji: '💈' },
  { label: 'Shampoo / Condicionador', emoji: '🧴' },
  { label: 'Óleo / Balm de barba', emoji: '🧴' },
  { label: 'Máquina / Tesoura', emoji: '✂️' },
  { label: 'Outro', emoji: '📦' },
]

const TIPOS_CLINICA: TipoProduto[] = [
  { label: 'Cosmético', emoji: '🧴' },
  { label: 'Dermocosmético', emoji: '🧪' },
  { label: 'Suplemento', emoji: '💊' },
  { label: 'Descartável', emoji: '🧤' },
  { label: 'Equipamento', emoji: '🩺' },
  { label: 'Outro', emoji: '📦' },
]

const TIPOS_GERAL: TipoProduto[] = [
  { label: 'Produto', emoji: '📦' },
  { label: 'Material', emoji: '🧰' },
  { label: 'Serviço', emoji: '🛠️' },
  { label: 'Outro', emoji: '📦' },
]

const CONVENIENCIA: CategoriaProduto = {
  key: 'diversos', label: 'Conveniência / Diversos', desc: 'Água, café, snacks...',
  emoji: '🛒', tipos: TIPOS_CONVENIENCIA,
}

const CONFIGS: Record<string, ConfigProduto> = {
  otica: {
    categorias: [
      { key: 'otica', label: 'Produto de Ótica', desc: 'Armações, lentes, óculos', emoji: '👓', tipos: TIPOS_OTICA },
      CONVENIENCIA,
    ],
    labelMarca: 'Grife / Marca', usaTamanhoCor: false, usaNcm: true,
    placeholderNome: 'Ex: Ray-Ban Aviador, Lente Transitions...',
  },
  loja: {
    categorias: [
      { key: 'roupa', label: 'Roupa', desc: 'Camisetas, calças, vestidos', emoji: '👕', tipos: TIPOS_ROUPA },
      { key: 'acessorio', label: 'Acessório', desc: 'Bolsas, calçados, bijuteria', emoji: '👜', tipos: TIPOS_ACESSORIO },
    ],
    labelMarca: 'Marca', usaTamanhoCor: true, usaNcm: false,
    placeholderNome: 'Ex: Polo Tricô, Camiseta Gola V...',
  },
  barbearia: {
    categorias: [
      { key: 'barbearia', label: 'Produto de Barbearia', desc: 'Pomada, shampoo, óleo', emoji: '💈', tipos: TIPOS_BARBEARIA },
      CONVENIENCIA,
    ],
    labelMarca: 'Marca', usaTamanhoCor: false, usaNcm: false,
    placeholderNome: 'Ex: Pomada Modeladora, Óleo de Barba...',
  },
  clinica: {
    categorias: [
      { key: 'clinica', label: 'Produto de Clínica', desc: 'Cosméticos, suplementos', emoji: '🩺', tipos: TIPOS_CLINICA },
      CONVENIENCIA,
    ],
    labelMarca: 'Marca', usaTamanhoCor: false, usaNcm: false,
    placeholderNome: 'Ex: Sérum Vitamina C, Protetor Solar...',
  },
  geral: {
    categorias: [
      { key: 'produto', label: 'Produto', desc: 'O que você vende', emoji: '📦', tipos: TIPOS_GERAL },
      CONVENIENCIA,
    ],
    labelMarca: 'Marca', usaTamanhoCor: false, usaNcm: false,
    placeholderNome: 'Ex: nome do produto',
  },
}

export function configProduto(businessType: string | null | undefined): ConfigProduto {
  return CONFIGS[businessType ?? ''] ?? CONFIGS.otica
}

/** Emoji do tipo, procurando em todos os ramos — produtos antigos podem ter tipo de outro ramo. */
export function emojiDoTipo(tipo: string | null): string {
  for (const cfg of Object.values(CONFIGS)) {
    for (const cat of cfg.categorias) {
      const achou = cat.tipos.find(t => t.label === tipo)
      if (achou) return achou.emoji
    }
  }
  return '📦'
}

/** Tamanhos sugeridos para roupa — o campo aceita qualquer texto (42, Único, etc.). */
export const TAMANHOS_SUGERIDOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único']
