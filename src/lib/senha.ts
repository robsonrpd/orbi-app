import { randomInt } from 'node:crypto'

/** Mesmo alfabeto dos códigos de loja: sem O/0/I/1/L, que se confundem quando a senha é ditada ou copiada. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Senha temporária legível, no formato XXXXX-XXXXX (10 caracteres, ~50 bits). */
export function gerarSenhaTemporaria(): string {
  const sorteia = (n: number) => Array.from({ length: n }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
  return `${sorteia(5)}-${sorteia(5)}`
}

export const SENHA_MIN = 8
