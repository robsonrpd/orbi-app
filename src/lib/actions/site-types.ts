export type SiteConfig = {
  titulo: string
  subtitulo: string
  corPrimaria: string
  corSecundaria: string
  whatsapp: string
  instagram: string
  endereco: string
  ordemServicos: string[]
  avisoAtivo: boolean
  avisoTexto: string
  paginaAtiva: boolean
  qrCorFrente: string
  qrCorFundo: string
  descontoAtivo: boolean
  descontoTipo: 'percentual' | 'fixo'
  descontoValor: number
}

export const SITE_DEFAULT: SiteConfig = {
  titulo: '',
  subtitulo: '',
  corPrimaria: '#1A56FF',
  corSecundaria: '#93AAFF',
  whatsapp: '',
  instagram: '',
  endereco: '',
  ordemServicos: [],
  avisoAtivo: false,
  avisoTexto: '',
  paginaAtiva: true,
  qrCorFrente: '#000000',
  qrCorFundo: '#FFFFFF',
  descontoAtivo: false,
  descontoTipo: 'percentual',
  descontoValor: 10,
}
