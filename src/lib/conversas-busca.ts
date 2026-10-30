import { createServiceClient } from '@/lib/supabase/server'
import { buscarTodos } from '@/lib/supabase/paginacao'

type Service = ReturnType<typeof createServiceClient>

/**
 * Chave de comparação de telefone: só os 8 últimos dígitos.
 * Existe por causa do 9º dígito do celular brasileiro — o mesmo cliente aparece como
 * 5569992117658 e 556992117658 dependendo de quem cadastrou.
 */
export function chaveTelefone(v: string | null | undefined) {
  return (v ?? '').replace(/\D/g, '').slice(-8)
}

/**
 * Acha a conversa da empresa pelo telefone.
 *
 * Antes cada lugar fazia `.select('id, numero, messages')` sem paginar e procurava em JS.
 * Dois problemas graves, os dois já reais em produção:
 *  1. o Postgrest corta em 1000 linhas SEM avisar — uma loja com 1186 conversas simplesmente
 *     não achava as que passavam disso, e quem envia mensagem criava uma conversa DUPLICADA
 *     em vez de continuar a existente, rachando o histórico do cliente em dois;
 *  2. trazia o histórico completo de TODAS as conversas só pra achar uma.
 *
 * Aqui a busca é paginada e carrega só id + numero.
 */
export async function acharConversaPorNumero(service: Service, companyId: string, numero: string) {
  return (await acharConversa(service, companyId, numero))?.id ?? null
}

/** Igual a acharConversaPorNumero, mas devolve também o número como está gravado na conversa. */
export async function acharConversa(service: Service, companyId: string, numero: string) {
  const chave = chaveTelefone(numero)
  if (!chave) return null
  const convs = await buscarTodos<{ id: string; numero: string | null }>(
    (de, ate) => service.from('conversations').select('id, numero').eq('company_id', companyId).range(de, ate),
    'conversa por número',
  )
  const achada = convs.find(c => chaveTelefone(c.numero) === chave)
  return achada?.numero ? { id: achada.id, numero: achada.numero } : null
}

type MsgDaLoja = { role: 'human'; content: string; ts: string; midia?: unknown }

/**
 * Registra na conversa UMA mensagem que a loja acabou de enviar (painel, CRM, cobrança automática).
 *
 * Grava pela função atômica do banco (anexar_mensagem): cria a conversa se não existir, trava a linha e não
 * se perde se o cliente escrever no mesmo instante. O jeito antigo — ler as mensagens, acrescentar no código e
 * regravar tudo — apagava a mensagem que chegasse no meio. Reaproveita o número já gravado na conversa para
 * não abrir uma segunda por causa do 9º dígito.
 * Devolve o id da conversa (ou null se a gravação falhou; o erro vai para o log).
 */
export async function registrarMensagemDaLoja(
  service: Service, companyId: string, contactId: string | null, numero: string, msg: MsgDaLoja,
): Promise<string | null> {
  const existente = await acharConversa(service, companyId, numero)
  const { data, error } = await service.rpc('anexar_mensagem', {
    p_company: companyId, p_numero: existente?.numero ?? numero, p_contact: contactId, p_msg: msg, p_marcar_cliente: true,
  })
  if (error) { console.error('[registrarMensagemDaLoja]', error.message); return null }
  return (data as string | null) ?? null
}

/** Mensagens de uma conversa específica (sem arrastar as das outras). */
export async function mensagensDaConversa(service: Service, id: string) {
  const { data } = await service.from('conversations').select('messages').eq('id', id).maybeSingle()
  return ((data as { messages?: unknown[] } | null)?.messages ?? []) as unknown[]
}

/** Acha o contato da empresa pelo telefone. Mesmo motivo: sem paginar, some acima de 1000. */
export async function acharContatoPorTelefone<T extends { phone: string | null }>(
  service: Service, companyId: string, telefone: string, campos = 'id, phone',
): Promise<T | null> {
  const chave = chaveTelefone(telefone)
  if (!chave) return null
  const contatos = await buscarTodos<T>(
    (de, ate) => service.from('contacts').select(campos).eq('company_id', companyId).range(de, ate) as never,
    'contato por telefone',
  )
  return contatos.find(c => chaveTelefone(c.phone) === chave) ?? null
}
