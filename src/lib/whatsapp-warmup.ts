// Limite automático de envios/dia pra números recém-conectados no WhatsApp.
// Números novos (pouco histórico real de uso) são muito mais sensíveis à
// detecção de spam do WhatsApp — esse "aquecimento" gradual reduz o risco
// de bloqueio, mesmo que o usuário configure um limite maior manualmente.

export type StatusAquecimento = {
  limite: number
  aquecendo: boolean
  diasConectado: number | null
  proximaFaixaEm: number | null // dias até o próximo aumento de limite, se aquecendo
}

const FAIXAS = [
  { ateDias: 3, max: 10 },
  { ateDias: 7, max: 20 },
  { ateDias: 14, max: 40 },
]

export function statusAquecimento(primeiraConexaoISO: string | null | undefined, limiteConfigurado: number): StatusAquecimento {
  if (!primeiraConexaoISO) {
    return { limite: Math.min(limiteConfigurado, FAIXAS[0].max), aquecendo: true, diasConectado: null, proximaFaixaEm: FAIXAS[0].ateDias }
  }
  const diasConectado = Math.floor((Date.now() - new Date(primeiraConexaoISO).getTime()) / 86_400_000)
  const faixa = FAIXAS.find(f => diasConectado < f.ateDias)
  if (!faixa) return { limite: limiteConfigurado, aquecendo: false, diasConectado, proximaFaixaEm: null }
  return { limite: Math.min(limiteConfigurado, faixa.max), aquecendo: true, diasConectado, proximaFaixaEm: faixa.ateDias - diasConectado }
}
