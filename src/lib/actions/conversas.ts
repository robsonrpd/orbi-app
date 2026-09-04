'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarTexto, enviarMedia, enviarAudio, statusInstancia, buscarFotoPerfil, apagarMensagemWhatsApp, ehGrupo, destinoDe } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'
import { acharConversaPorNumero, acharContatoPorTelefone, mensagensDaConversa } from '@/lib/conversas-busca'

type Midia = { tipo: string; url: string; nome?: string }
type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: Midia; ts?: string; waId?: string; waFromMe?: boolean; apagada?: boolean }

/** Extrai o id que o WhatsApp devolve ao enviar — é o que permite apagar a mensagem depois. */
function idDoEnvio(data: unknown): string | undefined {
  return (data as { key?: { id?: string } } | null)?.key?.id
}

export type ConversaResumo = {
  id: string
  numero: string
  contactId: string | null
  contactName: string | null
  contactFoto: string | null
  lastMessageAt: string | null
  handledByAi: boolean
  ultimaMensagem: string
  grupo: boolean
  grupoNome: string | null
}

/** Lista todas as conversas da empresa, mais recentes primeiro. */
export async function listarConversas(): Promise<ConversaResumo[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []

  const service = createServiceClient()
  // Limite explícito: sem ele o Postgrest corta em 1000 por conta própria, em silêncio —
  // uma loja movimentada passaria disso e perderia conversas sem nenhum aviso.
  // 500 cobre meses de histórico numa lista de conversas.
  const LIMITE_CONVERSAS = 500

  // grupo_nome é opcional: se a coluna ainda não existir, a lista carrega sem ela
  let convs: Record<string, unknown>[] | null = null
  const comGrupo = await service
    .from('conversations')
    .select('id, numero, contact_id, messages, last_message_at, handled_by_ai, grupo_nome')
    .eq('company_id', companyId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(LIMITE_CONVERSAS)
  if (comGrupo.error) {
    const semGrupo = await service
      .from('conversations')
      .select('id, numero, contact_id, messages, last_message_at, handled_by_ai')
      .eq('company_id', companyId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(LIMITE_CONVERSAS)
    convs = semGrupo.data as never
  } else {
    convs = comGrupo.data as never
  }

  const lista: Record<string, unknown>[] = convs ?? []
  const contactIds = [...new Set(lista.map(c => c.contact_id).filter(Boolean))] as string[]

  // Busca em lotes: com muitos contatos, um .in() único monta uma URL gigante e o
  // Postgrest devolve "Bad Request" — a lista voltava sem nome e sem foto de ninguém.
  // (Aconteceu de verdade: 977 contatos viravam uma URL de 36 mil caracteres.)
  const contatoPorId = new Map<string, { id: string; name: string | null; foto_url: string | null }>()
  const LOTE = 150
  for (let i = 0; i < contactIds.length; i += LOTE) {
    const fatia = contactIds.slice(i, i + LOTE)
    const { data, error } = await service.from('contacts').select('id, name, foto_url').in('id', fatia)
    if (error) { console.error('[listarConversas contatos]', error.message); continue }
    for (const ct of data ?? []) contatoPorId.set(ct.id, ct as never)
  }

  return lista.map(c => {
    const msgs = (c.messages as Msg[] | null) ?? []
    const ultima = msgs[msgs.length - 1]
    const contato = c.contact_id ? contatoPorId.get(c.contact_id as string) : null
    const numero = c.numero as string
    const grupo = ehGrupo(numero)
    const grupoNome = (c.grupo_nome as string | null) ?? null
    return {
      id: c.id as string,
      numero,
      contactId: (c.contact_id as string | null) ?? null,
      // grupo não tem contato: o nome vem do assunto do grupo
      contactName: grupo ? (grupoNome ?? 'Grupo') : (contato?.name ?? null),
      contactFoto: grupo ? null : (contato?.foto_url ?? null),
      lastMessageAt: (c.last_message_at as string | null) ?? null,
      handledByAi: !!c.handled_by_ai,
      ultimaMensagem: ultima ? (ultima.midia ? `📎 ${ultima.midia.tipo}` : ultima.content) : '',
      grupo,
      grupoNome,
    }
  })
}

/** Foto de perfil de um número (usado na tela de "nova conversa", antes de existir uma conversation). Busca no cadastro; se não tiver, tenta buscar ao vivo na Evolution API e salva pra próxima vez. */
export async function obterFotoContato(telefone: string): Promise<string | null> {
  const companyId = await getCompanyId()
  if (!companyId) return null

  const d = (telefone || '').replace(/\D/g, '')
  const chave = d.slice(-8)
  if (!chave) return null

  const service = createServiceClient()
  const contato = await acharContatoPorTelefone<{ id: string; phone: string | null; foto_url: string | null }>(
    service, companyId, d, 'id, phone, foto_url',
  )
  if (contato?.foto_url) return contato.foto_url

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return null

  const numeroFmt = d.startsWith('55') ? d : `55${d}`
  try {
    const foto = await buscarFotoPerfil(instance, numeroFmt)
    if (foto && contato) await service.from('contacts').update({ foto_url: foto } as never).eq('id', contato.id)
    return foto
  } catch { return null }
}

/** Mensagens completas de uma conversa. */
export async function obterMensagens(conversaId: string): Promise<Msg[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const service = createServiceClient()
  const { data } = await service.from('conversations').select('messages').eq('id', conversaId).eq('company_id', companyId).single()
  return (data?.messages as Msg[] | null) ?? []
}

/** Resolve a conversa + a instância do WhatsApp conectada, validando que pertence à empresa logada. */
async function resolverConversa(conversaId: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' as const }

  const service = createServiceClient()
  const { data: conv } = await service.from('conversations').select('id, numero, messages').eq('id', conversaId).eq('company_id', companyId).single()
  if (!conv) return { error: 'Conversa não encontrada.' as const }

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' as const }

  const st = await statusInstancia(instance)
  if (st.state !== 'open') return { error: 'O WhatsApp desconectou. Vá em Conexão WhatsApp e escaneie o QR Code de novo pra reconectar.' as const }

  return { service, conv, instance }
}

async function registrarSaida(service: ReturnType<typeof createServiceClient>, conv: { id: string; messages: unknown }, msg: Msg) {
  const comTimestamp = { ...msg, ts: msg.ts ?? new Date().toISOString() }
  const messages = [...((conv.messages as Msg[] | null) ?? []), comTimestamp].slice(-60)
  await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', conv.id)
  revalidatePath('/dashboard/conversas')
}

/**
 * Apaga uma mensagem da conversa.
 * - paraTodos: apaga também no celular do cliente (só vale pra mensagens enviadas pela loja,
 *   dentro do prazo do WhatsApp, e que tenham o identificador guardado).
 * - senão: some apenas do painel do Orbi, sem mexer no WhatsApp de ninguém.
 *
 * A mensagem é localizada pelo horário (ts), não pela posição: o histórico é cortado nas
 * últimas 40/60 mensagens, então a posição pode mudar entre carregar a tela e clicar em apagar.
 */
export async function apagarMensagem(conversaId: string, p: { ts?: string; indice: number; paraTodos: boolean }) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: conv } = await service.from('conversations')
    .select('id, numero, messages').eq('id', conversaId).eq('company_id', companyId).single()
  if (!conv) return { error: 'Conversa não encontrada.' }

  const msgs = (conv.messages as Msg[] | null) ?? []
  let i = p.ts ? msgs.findIndex(m => m.ts === p.ts) : -1
  if (i < 0 && p.indice >= 0 && p.indice < msgs.length) i = p.indice
  if (i < 0) return { error: 'Mensagem não encontrada. Atualize a tela e tente de novo.' }

  const alvo = msgs[i]

  if (p.paraTodos) {
    if (!alvo.waFromMe) return { error: 'Só dá pra apagar para todos as mensagens enviadas pela loja.' }
    if (!alvo.waId) return { error: 'Essa mensagem é anterior a esse recurso, então só dá pra apagar aqui do painel.' }

    const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
    const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
    if (!instance) return { error: 'WhatsApp não conectado.' }

    const r = await apagarMensagemWhatsApp(instance, {
      id: alvo.waId,
      // grupo já vem com o JID completo; contato individual precisa do sufixo
      remoteJid: ehGrupo(conv.numero) ? conv.numero : `${conv.numero.replace(/\D/g, '')}@s.whatsapp.net`,
      fromMe: true,
    })
    if (!r.ok) {
      const detalhe = typeof r.data === 'string' ? r.data : JSON.stringify(r.data ?? '')
      return { error: `O WhatsApp recusou apagar (talvez tenha passado do prazo). ${detalhe}`.trim() }
    }

    // igual ao app: a mensagem continua no histórico, marcada como apagada
    const novas = [...msgs]
    novas[i] = { ...alvo, apagada: true, content: 'Mensagem apagada', midia: undefined }
    await service.from('conversations').update({ messages: novas }).eq('id', conv.id)
  } else {
    await service.from('conversations').update({ messages: msgs.filter((_, idx) => idx !== i) }).eq('id', conv.id)
  }

  revalidatePath('/dashboard/conversas')
  return { success: true as const }
}

/** Envia uma resposta manual de texto pelo WhatsApp e registra na conversa. */
export async function responderConversa(conversaId: string, texto: string, opts?: { confirmarPrimeiroContato?: boolean }) {
  const limpo = texto.trim()
  if (!limpo) return { error: 'Digite uma mensagem.' }

  const r = await resolverConversa(conversaId)
  if ('error' in r) return r

  // segurança: mandar mensagem pra quem nunca escreveu primeiro é o principal gatilho de bloqueio do WhatsApp
  const jaRecebemos = ((r.conv.messages as Msg[] | null) ?? []).some(m => m.role === 'user')
  if (!jaRecebemos && !opts?.confirmarPrimeiroContato) {
    return { avisoPrimeiroContato: true as const }
  }

  const env = await enviarTexto(r.instance, destinoDe(r.conv.numero), limpo)
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  await registrarSaida(r.service, r.conv, { role: 'human', content: limpo, waId: idDoEnvio(env.data), waFromMe: true })
  return { success: true as const }
}

/** Inicia uma conversa nova com um número que ainda não tem conversa registrada (ex: a partir da ficha do cliente). */
export async function iniciarConversa(numero: string, texto: string, opts?: { confirmarPrimeiroContato?: boolean }) {
  const limpo = texto.trim()
  if (!limpo) return { error: 'Digite uma mensagem.' }

  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const d = (numero || '').replace(/\D/g, '')
  if (!d) return { error: 'Número inválido.' }
  const numeroFmt = d.startsWith('55') ? d : `55${d}`
  const chave = numeroFmt.slice(-8)

  const service = createServiceClient()
  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' }

  const st = await statusInstancia(instance)
  if (st.state !== 'open') return { error: 'O WhatsApp desconectou. Vá em Conexão WhatsApp e escaneie o QR Code de novo pra reconectar.' }

  const existenteId = await acharConversaPorNumero(service, companyId, numeroFmt)
  const msgsExistentes = existenteId ? (await mensagensDaConversa(service, existenteId)) as Msg[] : []

  // segurança: mandar mensagem pra quem nunca escreveu primeiro é o principal gatilho de bloqueio do WhatsApp
  const jaRecebemos = msgsExistentes.some(m => m.role === 'user')
  if (!jaRecebemos && !opts?.confirmarPrimeiroContato) {
    return { avisoPrimeiroContato: true as const }
  }

  const env = await enviarTexto(instance, numeroFmt, limpo)
  if (!env.ok) {
    const d = env.data as { message?: string | string[]; error?: string; response?: { message?: string | string[] } } | null
    const detalhe = d?.response?.message ?? d?.message ?? d?.error ?? (typeof d === 'string' ? d : null)
    const texto = Array.isArray(detalhe) ? detalhe.join(' ') : detalhe
    return { error: `Falha ao enviar pelo WhatsApp${env.status ? ` (${env.status})` : ''}${texto ? `: ${texto}` : '.'}` }
  }

  const nova: Msg = { role: 'human', content: limpo, ts: new Date().toISOString() }

  if (existenteId) {
    const messages = [...msgsExistentes, nova].slice(-60)
    await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', existenteId)
    revalidatePath('/dashboard/conversas')
    return { success: true as const, conversaId: existenteId }
  }

  const contact = await acharContatoPorTelefone<{ id: string; phone: string | null }>(service, companyId, numeroFmt)

  const { data: criada, error } = await service.from('conversations').insert({
    company_id: companyId, contact_id: contact?.id ?? null, numero: numeroFmt,
    messages: [nova], handled_by_ai: false, last_message_at: new Date().toISOString(),
  }).select('id').single()
  if (error || !criada) return { error: 'Mensagem enviada, mas houve um erro ao salvar a conversa.' }

  revalidatePath('/dashboard/conversas')
  return { success: true as const, conversaId: criada.id }
}

/** Envia uma imagem ou documento (já hospedado em uma URL pública) pelo WhatsApp. */
export async function enviarMidiaConversa(conversaId: string, p: { url: string; mediatype: 'image' | 'document' | 'video'; fileName?: string }) {
  const r = await resolverConversa(conversaId)
  if ('error' in r) return r

  const env = await enviarMedia(r.instance, destinoDe(r.conv.numero), { mediatype: p.mediatype, media: p.url, fileName: p.fileName })
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  await registrarSaida(r.service, r.conv, { role: 'human', content: p.fileName || 'Arquivo', midia: { tipo: p.mediatype, url: p.url, nome: p.fileName }, waId: idDoEnvio(env.data), waFromMe: true })
  return { success: true as const }
}

/** Envia um áudio de voz (já hospedado em uma URL pública) pelo WhatsApp. */
export async function enviarAudioConversa(conversaId: string, url: string) {
  const r = await resolverConversa(conversaId)
  if ('error' in r) return r

  const env = await enviarAudio(r.instance, destinoDe(r.conv.numero), url)
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  await registrarSaida(r.service, r.conv, { role: 'human', content: '🎤 Áudio', midia: { tipo: 'audio', url }, waId: idDoEnvio(env.data), waFromMe: true })
  return { success: true as const }
}
