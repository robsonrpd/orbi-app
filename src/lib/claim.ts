import { createHash } from 'node:crypto'

// Código de loja: uso único, entregue ao dono de uma loja que JÁ existe no sistema (com os leads e o
// WhatsApp ligados). Sem ele, quem se cadastra cria uma loja nova e vazia.
//
// Só o HASH do código fica no banco (companies.settings.claim_hash): quem lê o banco não consegue
// reconstituir o código. Depois de usado o hash é apagado, então ele não vale uma segunda vez.

/** Sem O/0/I/1/L, que se confundem quando o código é ditado ou copiado de uma mensagem. */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const TAMANHO_CODIGO = 10

/** Aceita o que a pessoa digitou do jeito dela: minúsculas, espaços, hífen. */
export function normalizarCodigo(codigo: string): string {
  return (codigo ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function hashCodigo(codigo: string): string {
  return createHash('sha256').update(normalizarCodigo(codigo)).digest('hex')
}

/** O código vale a pena ser consultado? (evita ida ao banco por lixo digitado) */
export function codigoPareceValido(codigo: string): boolean {
  return normalizarCodigo(codigo).length === TAMANHO_CODIGO
}
