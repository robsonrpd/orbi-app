// Geração de código de barras interno (EAN-13) para peças que não têm etiqueta de fábrica.
//
// Por que EAN-13: é o padrão que qualquer leitor de loja lê sem precisar de configuração,
// e é só número — se a etiqueta rasgar, dá pra digitar o código na mão no PDV.
//
// O prefixo "2" é a faixa que o padrão GS1 reserva para uso interno do estabelecimento.
// Isso garante que um código criado pela loja nunca vai colidir com o código de fábrica
// de uma peça de marca (BOSS, por exemplo), que usa outras faixas.

/** Dígito verificador do EAN-13, calculado sobre os 12 primeiros dígitos. */
export function digitoVerificadorEan13(doze: string): string {
  let soma = 0
  for (let i = 0; i < 12; i++) {
    const d = Number(doze[i])
    soma += i % 2 === 0 ? d : d * 3
  }
  return String((10 - (soma % 10)) % 10)
}

/** Monta o EAN-13 interno a partir de um número sequencial da loja. */
export function montarEan13Interno(sequencial: number): string {
  const base = '2' + String(sequencial).padStart(11, '0')
  return base + digitoVerificadorEan13(base)
}

/**
 * Extrai o número sequencial de um código interno gerado pelo Orbi.
 * Retorna null se o código não for interno (ex: veio da etiqueta do fabricante),
 * para que a numeração da loja continue de onde parou sem contar códigos de fora.
 */
export function sequencialDoEan13Interno(codigo: string): number | null {
  if (!/^2\d{12}$/.test(codigo)) return null
  const base = codigo.slice(0, 12)
  if (digitoVerificadorEan13(base) !== codigo[12]) return null
  return Number(codigo.slice(1, 12))
}
