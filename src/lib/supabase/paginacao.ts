// O Postgrest devolve no máximo 1000 linhas por consulta — e faz isso EM SILÊNCIO,
// sem erro e sem aviso. Uma consulta que funciona com 900 clientes começa a perder
// dados aos 1001, e o sintoma aparece longe da causa: cliente que "sumiu" da lista,
// contato duplicado porque o sistema não achou o que já existia, relatório com número
// errado. Toda leitura que pode crescer com o tempo precisa passar por aqui.

type Resposta<T> = { data: T[] | null; error: { message: string } | null }

const PAGINA = 1000
const MAX_PAGINAS = 50 // teto de segurança: 50 mil linhas

/**
 * Busca todas as linhas de uma consulta, em páginas.
 *
 * @param consulta monta a query para um intervalo — ex:
 *   (de, ate) => service.from('contacts').select('id').eq('company_id', x).range(de, ate)
 * @param rotulo identifica a origem no log, pra falha nunca passar despercebida
 */
export async function buscarTodos<T>(
  consulta: (de: number, ate: number) => PromiseLike<Resposta<T>>,
  rotulo: string,
): Promise<T[]> {
  const todos: T[] = []
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const de = pagina * PAGINA
    const { data, error } = await consulta(de, de + PAGINA - 1)
    if (error) {
      // devolve o que já veio em vez de perder tudo, mas deixa registrado
      console.error(`[buscarTodos:${rotulo}]`, error.message)
      break
    }
    const lote = data ?? []
    todos.push(...lote)
    if (lote.length < PAGINA) break // última página
  }
  return todos
}
