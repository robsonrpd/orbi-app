'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarTexto, enviarMedia, enviarAudio, statusInstancia, buscarFotoPerfil, apagarMensagemWhatsApp, ehGrupo, destinoDe, getMediaBase64, enviarContato, enviarEnquete, enviarFigurinha, numeroDaInstancia, enviarReacao, type Citacao } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'
import { acharConversa, acharContatoPorTelefone, mensagensDaConversa, registrarMensagemDaLoja, numeroDoEnvio } from '@/lib/conversas-busca'
import { atualizarFotoDoContato } from '@/lib/foto-perfil'
import { buscarTodos } from '@/lib/supabase/paginacao'

type Midia = { tipo: string; url: string; nome?: string }
type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: Midia; ts?: string; waId?: string; waFromMe?: boolean; apagada?: boolean; status?: 'sent' | 'delivered' | 'read'; resposta?: { waId: string; texto: string }; encaminhada?: boolean }

/** Extrai o id que o WhatsApp devolve ao enviar — é o que permite apagar a mensagem depois. */
function idDoEnvio(data: unknown): string | undefined {
  return (data as { key?: { id?: string } } | null)?.key?.id
}

/** Prévia da última mensagem na lista: "📷 Foto", "🎤 Áudio"... (antes aparecia o tipo cru: "📎 image") */
function previaDaMidia(tipo: string | null, texto: string | null) {
  const t = (texto ?? '').trim()
  if (!tipo) return t
  const generico = !t || /^(📷|🎤|🎥|📎|😀)/.test(t)
  if (tipo === 'image') return generico ? '📷 Foto' : `📷 ${t}`
  if (tipo === 'audio') return '🎤 Áudio'
  if (tipo === 'video') return generico ? '🎥 Vídeo' : `🎥 ${t}`
  if (tipo === 'document') return t.startsWith('📎') ? t : `📎 ${t || 'Documento'}`
  return t || '📎 Arquivo'
}

export type ConversaResumo = {
  id: string
  numero: string
  contactId: string | null
  contactName: string | null
  contactFoto: string | null
  lastMessageAt: string | null
  /** Última mudança na conversa: mensagem nova OU leitura/entrega. É a marca d'água da atualização incremental. */
  atividadeEm: string | null
  handledByAi: boolean
  ultimaMensagem: string
  grupo: boolean
  grupoNome: string | null
  /** etiquetas do contato (as mesmas do Funil) */
  contactTags: string[]
}

type LinhaResumo = {
  id: string; numero: string; contact_id: string | null; grupo_nome: string | null
  last_message_at: string | null; atividade_em?: string | null; handled_by_ai: boolean | null
  ultima_texto: string | null; ultima_midia: string | null
}

/** Junta nome e foto do contato a cada linha do resumo e monta o formato que a tela usa. */
async function montarResumos(service: ReturnType<typeof createServiceClient>, lista: LinhaResumo[]): Promise<ConversaResumo[]> {
  const contactIds = [...new Set(lista.map(c => c.contact_id).filter(Boolean))] as string[]

  // Busca em lotes: com muitos contatos, um .in() único monta uma URL gigante e o
  // Postgrest devolve "Bad Request" — a lista voltava sem nome e sem foto de ninguém.
  // (Aconteceu de verdade: 977 contatos viravam uma URL de 36 mil caracteres.)
  const contatoPorId = new Map<string, { id: string; name: string | null; foto_url: string | null; tags: string[] | null }>()
  const LOTE = 150
  for (let i = 0; i < contactIds.length; i += LOTE) {
    const fatia = contactIds.slice(i, i + LOTE)
    const { data, error } = await service.from('contacts').select('id, name, foto_url, tags').in('id', fatia)
    if (error) { console.error('[montarResumos contatos]', error.message); continue }
    for (const ct of data ?? []) contatoPorId.set(ct.id, ct as never)
  }

  return lista.map(c => {
    const contato = c.contact_id ? contatoPorId.get(c.contact_id) : null
    const grupo = ehGrupo(c.numero)
    const grupoNome = c.grupo_nome ?? null
    return {
      id: c.id,
      numero: c.numero,
      contactId: c.contact_id ?? null,
      // grupo não tem contato: o nome vem do assunto do grupo
      contactName: grupo ? (grupoNome ?? 'Grupo') : (contato?.name ?? null),
      contactFoto: grupo ? null : (contato?.foto_url ?? null),
      lastMessageAt: c.last_message_at ?? null,
      atividadeEm: c.atividade_em ?? c.last_message_at ?? null,
      handledByAi: !!c.handled_by_ai,
      ultimaMensagem: previaDaMidia(c.ultima_midia, c.ultima_texto),
      grupo,
      grupoNome,
      contactTags: grupo ? [] : (contato?.tags ?? []),
    }
  })
}

// Limite explícito: sem ele o Postgrest corta em 1000 por conta própria, em silêncio —
// uma loja movimentada passaria disso e perderia conversas sem nenhum aviso.
// 500 cobre meses de histórico numa lista de conversas.
const LIMITE_CONVERSAS = 500

/**
 * Lista as conversas da empresa, mais recentes primeiro.
 *
 * Usa a função conversas_resumo (supabase/conversas-resumo.sql), que devolve só o texto da última
 * mensagem. A consulta antiga baixava o histórico inteiro das 500 conversas (~1,2 MB por chamada) e a
 * tela chamava isso a cada 6 segundos — estourava a cota gratuita do Supabase em um dia.
 */
export async function listarConversas(): Promise<ConversaResumo[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const service = createServiceClient()

  const { data, error } = await service.rpc('conversas_resumo', { p_company: companyId, p_limite: LIMITE_CONVERSAS })
  if (!error) return montarResumos(service, (data ?? []) as LinhaResumo[])

  // Plano B se a função não existir (banco restaurado sem rodar o SQL): funciona, só é pesado.
  console.error('[listarConversas] conversas_resumo indisponível, usando consulta completa:', error.message)
  const { data: convs } = await service
    .from('conversations')
    .select('id, numero, contact_id, messages, last_message_at, handled_by_ai, grupo_nome')
    .eq('company_id', companyId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(LIMITE_CONVERSAS)
  const linhas: LinhaResumo[] = ((convs ?? []) as Record<string, unknown>[]).map(c => {
    const msgs = (c.messages as Msg[] | null) ?? []
    const ultima = msgs[msgs.length - 1]
    return {
      id: c.id as string, numero: c.numero as string, contact_id: (c.contact_id as string | null) ?? null,
      grupo_nome: (c.grupo_nome as string | null) ?? null, last_message_at: (c.last_message_at as string | null) ?? null,
      handled_by_ai: !!c.handled_by_ai,
      ultima_texto: ultima ? (ultima.content ?? '').slice(0, 160) : null,
      ultima_midia: ultima?.midia?.tipo ?? null,
    }
  })
  return montarResumos(service, linhas)
}

/**
 * Só as conversas com atividade a partir de `desde` (a marca d'água da lista que a tela já tem).
 * É o que a tela consulta a cada poucos segundos: quando nada mudou a resposta é vazia, em vez de
 * baixar a lista toda de novo.
 */
export async function conversasAtualizadas(desde: string | null): Promise<ConversaResumo[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const service = createServiceClient()
  const { data, error } = await service.rpc('conversas_resumo', { p_company: companyId, p_limite: 100, p_desde: desde })
  if (error) { console.error('[conversasAtualizadas]', error.message); return [] }
  const linhas = (data ?? []) as LinhaResumo[]
  return linhas.length ? montarResumos(service, linhas) : []
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
    if (contato) {
      // contato cadastrado: baixa e hospeda a foto (o link do WhatsApp vence em ~2 semanas) e devolve o link permanente
      const r = await atualizarFotoDoContato(service, { companyId, contactId: contato.id, instance, phone: numeroFmt })
      if (r !== 'ok') return null
      const { data } = await service.from('contacts').select('foto_url').eq('id', contato.id).maybeSingle()
      return (data as { foto_url: string | null } | null)?.foto_url ?? null
    }
    // ainda não é contato: só mostra a foto na tela (não há onde guardar)
    return await buscarFotoPerfil(instance, numeroFmt)
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
  const { data: conv } = await service.from('conversations').select('id, numero, messages, contact_id, company_id').eq('id', conversaId).eq('company_id', companyId).single()
  if (!conv) return { error: 'Conversa não encontrada.' as const }

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' as const }

  const st = await statusInstancia(instance)
  if (st.state !== 'open') return { error: 'O WhatsApp desconectou. Vá em Conexão WhatsApp e escaneie o QR Code de novo pra reconectar.' as const }

  return { service, conv, instance }
}

async function registrarSaida(service: ReturnType<typeof createServiceClient>, conv: { id: string; numero: string; contact_id?: string | null; company_id: string }, msg: Msg) {
  const comTimestamp = { ...msg, ts: msg.ts ?? new Date().toISOString() }
  // gravação atômica no banco: não apaga a mensagem que o cliente mandar no mesmo instante
  const { error } = await service.rpc('anexar_mensagem', {
    p_company: conv.company_id, p_numero: conv.numero, p_contact: conv.contact_id ?? null, p_msg: comTimestamp, p_marcar_cliente: true,
  })
  if (error) console.error('[registrarSaida]', error.message)
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
export async function responderConversa(conversaId: string, texto: string, opts?: { confirmarPrimeiroContato?: boolean; respondendoA?: string }) {
  const limpo = texto.trim()
  if (!limpo) return { error: 'Digite uma mensagem.' }

  const r = await resolverConversa(conversaId)
  if ('error' in r) return r

  // segurança: mandar mensagem pra quem nunca escreveu primeiro é o principal gatilho de bloqueio do WhatsApp
  const jaRecebemos = ((r.conv.messages as Msg[] | null) ?? []).some(m => m.role === 'user')
  if (!jaRecebemos && !opts?.confirmarPrimeiroContato) {
    return { avisoPrimeiroContato: true as const }
  }

  // "Responder": cita a mensagem escolhida (o cliente vê o balão citado, como no WhatsApp)
  const citada = opts?.respondendoA ? await acharMensagemPorWaId(r.service, r.conv.id, ((r.conv.messages as Msg[] | null) ?? []), opts.respondendoA) : null
  const citacao: Citacao | undefined = citada?.waId
    ? { id: citada.waId, remoteJid: jidDaConversa(r.conv.numero), fromMe: citada.role !== 'user', texto: citada.content }
    : undefined

  const env = await enviarTexto(r.instance, destinoDe(r.conv.numero), limpo, citacao)
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  const resposta = citada?.waId ? { waId: citada.waId, texto: citada.content.slice(0, 200) } : undefined
  await registrarSaida(r.service, r.conv, { role: 'human', content: limpo, waId: idDoEnvio(env.data), waFromMe: true, ...(resposta ? { resposta } : {}) })
  return { success: true as const, resposta }
}

function jidDaConversa(numero: string) {
  return ehGrupo(numero) ? numero : `${destinoDe(numero)}@s.whatsapp.net`
}

/** Acha uma mensagem da conversa pelo id do WhatsApp (na conversa ativa ou no arquivo de antigas). */
async function acharMensagemPorWaId(service: ReturnType<typeof createServiceClient>, conversaId: string, ativas: Msg[], waId: string): Promise<Msg | null> {
  const ativa = ativas.find(m => m.waId === waId)
  if (ativa) return ativa
  const { data } = await service.from('mensagens_arquivo' as never).select('msg').eq('conversation_id', conversaId).eq('msg->>waId', waId).limit(1)
  return ((data ?? []) as { msg: Msg }[])[0]?.msg ?? null
}

/** Reage a uma mensagem (👍❤️…), como no WhatsApp. emoji vazio remove a reação da loja. */
export async function reagirMensagem(conversaId: string, waId: string, emoji: string) {
  const r = await resolverConversa(conversaId)
  if ('error' in r) return r
  const alvo = await acharMensagemPorWaId(r.service, r.conv.id, ((r.conv.messages as Msg[] | null) ?? []), waId)
  if (!alvo) return { error: 'Mensagem não encontrada.' }
  const env = await enviarReacao(r.instance, { id: waId, remoteJid: jidDaConversa(r.conv.numero), fromMe: alvo.role !== 'user' }, emoji)
  if (!env.ok) return { error: 'O WhatsApp não aceitou a reação.' }
  const { error } = await r.service.rpc('reagir_mensagem', { p_company: r.conv.company_id, p_numero: r.conv.numero, p_wa_id: waId, p_quem: 'loja', p_emoji: emoji })
  if (error) console.error('[reagir]', error.message)
  return { success: true as const }
}

/**
 * Encaminha mensagens desta conversa para outras conversas (texto, foto, vídeo, documento, áudio), como o
 * "Encaminhar" do WhatsApp. Cada destino é validado como sendo da mesma loja (resolverConversa).
 */
export async function encaminharMensagens(origemId: string, chaves: string[], destinos: string[]) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!chaves.length || !destinos.length) return { error: 'Escolha a mensagem e para quem encaminhar.' }
  if (destinos.length > 20) return { error: 'Encaminhe para no máximo 20 conversas de cada vez.' }
  const service = createServiceClient()
  const { data: origem } = await service.from('conversations').select('id, messages').eq('id', origemId).eq('company_id', companyId).single()
  if (!origem) return { error: 'Conversa não encontrada.' }
  const ativas = (origem.messages as Msg[] | null) ?? []
  const msgs: Msg[] = []
  for (const chave of chaves) {
    const m = ativas.find(x => x.waId === chave || x.ts === chave) ?? await acharMensagemPorWaId(service, origemId, [], chave)
    if (m && !m.apagada) msgs.push(m)
  }
  if (!msgs.length) return { error: 'Mensagem não encontrada.' }

  let enviadas = 0, falhas = 0
  for (const destinoId of destinos) {
    const r = await resolverConversa(destinoId)
    if ('error' in r) { falhas++; continue }
    const para = destinoDe(r.conv.numero)
    for (const m of msgs) {
      const legenda = /^(📷|🎥|🎤|📎|😀)/.test(m.content) ? undefined : m.content
      const env = !m.midia ? await enviarTexto(r.instance, para, m.content)
        : m.midia.tipo === 'audio' ? await enviarAudio(r.instance, para, m.midia.url)
        : await enviarMedia(r.instance, para, { mediatype: m.midia.tipo, media: m.midia.url, fileName: m.midia.nome, caption: m.midia.tipo === 'document' ? undefined : legenda })
      if (!env.ok) { falhas++; continue }
      enviadas++
      await registrarSaida(r.service, r.conv, { role: 'human', content: m.content, ...(m.midia ? { midia: m.midia } : {}), waId: idDoEnvio(env.data), waFromMe: true, encaminhada: true })
      await new Promise(res => setTimeout(res, 600)) // ritmo humano entre envios
    }
  }
  revalidatePath('/dashboard/conversas')
  if (!enviadas) return { error: 'Nada foi encaminhado. Confira se o WhatsApp está conectado.' }
  return { success: true as const, enviadas, falhas }
}

/**
 * Busca contatos para iniciar conversa ou mandar cartão: a AGENDA do celular da loja (nome salvo no telefone) e os
 * clientes/leads do Orbi. Sem termo, devolve os primeiros em ordem alfabética.
 */
export async function buscarContatos(termo: string): Promise<{ nome: string; numero: string; origem: 'agenda' | 'cliente' }[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const service = createServiceClient()
  const t = termo.trim()
  const digitos = t.replace(/\D/g, '')
  const filtroNome = t.replace(/[%,()*]/g, ' ')
  let qa = service.from('agenda_contatos' as never).select('nome, numero').eq('company_id', companyId).order('nome').limit(30)
  let qc = service.from('contacts').select('name, phone').eq('company_id', companyId).not('phone', 'is', null).order('name').limit(30)
  if (digitos.length >= 3) { qa = qa.like('numero', `%${digitos}%`); qc = qc.like('phone', `%${digitos}%`) }
  else if (t) { qa = qa.ilike('nome', `%${filtroNome}%`); qc = qc.ilike('name', `%${filtroNome}%`) }
  const [{ data: ag }, { data: cl }] = await Promise.all([qa, qc])
  const vistos = new Set<string>()
  const saida: { nome: string; numero: string; origem: 'agenda' | 'cliente' }[] = []
  for (const a of (ag ?? []) as { nome: string; numero: string }[]) {
    const k = a.numero.slice(-8); if (vistos.has(k)) continue; vistos.add(k)
    saida.push({ nome: a.nome, numero: a.numero, origem: 'agenda' })
  }
  for (const c of (cl ?? []) as { name: string | null; phone: string }[]) {
    const n = (c.phone ?? '').replace(/\D/g, ''); const k = n.slice(-8)
    if (!n || vistos.has(k)) continue; vistos.add(k)
    saida.push({ nome: c.name || n, numero: n.length <= 11 ? `55${n}` : n, origem: 'cliente' })
  }
  return saida.slice(0, 40)
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

  const existente = await acharConversa(service, companyId, numeroFmt)
  const existenteId = existente?.id ?? null
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

  const contact = existente ? null : await acharContatoPorTelefone<{ id: string; phone: string | null }>(service, companyId, numeroFmt)
  // gravação atômica (cria a conversa se não existir; não apaga mensagem que chegue no mesmo instante)
  const conversaId = await registrarMensagemDaLoja(service, companyId, contact?.id ?? null, existente?.numero ?? numeroDoEnvio(env.data) ?? numeroFmt,
    { role: 'human', content: limpo, ts: nova.ts ?? new Date().toISOString() })
  if (!conversaId) return { error: 'Mensagem enviada, mas houve um erro ao salvar a conversa.' }

  revalidatePath('/dashboard/conversas')
  return { success: true as const, conversaId }
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

/**
 * Mensagens ANTERIORES às que a conversa mostra (as mais antigas ficam no arquivo: a conversa ativa guarda
 * só as últimas 40 pra não pesar). Devolve até `limite` mensagens imediatamente anteriores a `antesDe`, em ordem
 * cronológica, e se ainda há mais antigas.
 */
export async function obterMensagensAnteriores(conversaId: string, antesDe: string | null, limite = 50): Promise<{ msgs: Msg[]; temMais: boolean }> {
  const companyId = await getCompanyId()
  if (!companyId) return { msgs: [], temMais: false }
  const service = createServiceClient()
  // a conversa precisa ser DESTA loja (o arquivo é lido pelo id da conversa)
  const { data: conv } = await service.from('conversations').select('id').eq('id', conversaId).eq('company_id', companyId).maybeSingle()
  if (!conv) return { msgs: [], temMais: false }

  let q = service.from('mensagens_arquivo').select('msg, ts').eq('conversation_id', conversaId).eq('company_id', companyId)
  if (antesDe) q = q.lt('ts', antesDe)
  const { data } = await q.order('ts', { ascending: false }).limit(limite + 1)
  const linhas = (data ?? []) as { msg: Msg; ts: string }[]
  return { msgs: linhas.slice(0, limite).map(l => l.msg).reverse(), temMais: linhas.length > limite }
}

/** A conversa tem mensagens no arquivo? (decide se o botão "ver mensagens anteriores" aparece) */
export async function temMensagensAnteriores(conversaId: string): Promise<boolean> {
  const companyId = await getCompanyId()
  if (!companyId) return false
  const service = createServiceClient()
  const { count } = await service.from('mensagens_arquivo').select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversaId).eq('company_id', companyId)
  return (count ?? 0) > 0
}

const EXT_MIDIA: Record<string, string> = { image: 'jpg', audio: 'ogg', video: 'mp4', document: 'bin' }

/**
 * Baixa sob demanda um arquivo do HISTÓRICO importado (foto, áudio, vídeo, documento): busca no WhatsApp pelo
 * endereço guardado na mensagem (midiaPendente), hospeda no Storage e troca o endereço pelo arquivo.
 * O WhatsApp só guarda esses arquivos por algumas semanas; depois disso não há como recuperar.
 */
export async function baixarMidiaPendente(conversaId: string, waId: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()

  const { data: conv } = await service.from('conversations').select('id, messages').eq('id', conversaId).eq('company_id', companyId).single()
  if (!conv) return { error: 'Conversa não encontrada.' }
  type ComPendente = { waId?: string; midiaPendente?: { tipo: string; nome?: string; no: string; dados: Record<string, unknown>; jid: string; fromMe: boolean } }
  let alvo = ((conv.messages as ComPendente[] | null) ?? []).find(m => m.waId === waId)
  if (!alvo) {
    const { data: arq } = await service.from('mensagens_arquivo' as never).select('msg').eq('conversation_id', conversaId).eq('msg->>waId', waId).limit(1)
    alvo = ((arq ?? []) as { msg: ComPendente }[])[0]?.msg
  }
  const p = alvo?.midiaPendente
  if (!p) return { error: 'Este arquivo não pode ser baixado.' }

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' }

  const r = await getMediaBase64(instance, { key: { remoteJid: p.jid, fromMe: p.fromMe, id: waId }, message: { [p.no]: p.dados } })
  if (!r.base64) return { error: 'O WhatsApp não guarda mais este arquivo. Peça para o cliente enviar de novo.' }

  const nome = p.nome
  const ext = nome && nome.includes('.') ? nome.split('.').pop() : EXT_MIDIA[p.tipo] || 'bin'
  const caminho = `${companyId}/wa/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const mime = r.mimetype || (typeof p.dados.mimetype === 'string' ? p.dados.mimetype : undefined)
  const { error: eUp } = await service.storage.from('fotos').upload(caminho, Buffer.from(r.base64.replace(/^data:[^;]+;base64,/, ''), 'base64'), { contentType: mime, upsert: false })
  if (eUp) { console.error('[midia pendente]', eUp.message); return { error: 'Não foi possível guardar o arquivo.' } }

  const midia = { tipo: p.tipo, url: service.storage.from('fotos').getPublicUrl(caminho).data.publicUrl, ...(nome ? { nome } : {}) }
  const { error: eTroca } = await service.rpc('trocar_midia_pendente', { p_conversation: conversaId, p_wa_id: waId, p_midia: midia })
  if (eTroca) console.error('[midia pendente troca]', eTroca.message)
  return { success: true as const, midia }
}

/** Envia um cartão de contato na conversa. */
export async function enviarContatoConversa(conversaId: string, p: { nome: string; telefone: string }) {
  const nome = p.nome.trim(), tel = p.telefone.replace(/\D/g, '')
  if (!nome || tel.length < 10) return { error: 'Informe o nome e o telefone com DDD.' }
  const telefone = tel.length <= 11 ? `55${tel}` : tel
  const r = await resolverConversa(conversaId)
  if ('error' in r) return r
  const env = await enviarContato(r.instance, destinoDe(r.conv.numero), { nome, telefone })
  if (!env.ok) return { error: 'Falha ao enviar o contato pelo WhatsApp.' }
  const conteudo = `👤 ${nome} (+${telefone})`
  await registrarSaida(r.service, r.conv, { role: 'human', content: conteudo, waId: idDoEnvio(env.data), waFromMe: true })
  return { success: true as const, conteudo }
}

/** Envia uma enquete na conversa. */
export async function enviarEnqueteConversa(conversaId: string, p: { pergunta: string; opcoes: string[]; variasRespostas: boolean }) {
  const pergunta = p.pergunta.trim()
  const opcoes = [...new Set(p.opcoes.map(o => o.trim()).filter(Boolean))].slice(0, 12)
  if (!pergunta) return { error: 'Escreva a pergunta.' }
  if (opcoes.length < 2) return { error: 'A enquete precisa de pelo menos 2 opções diferentes.' }
  const r = await resolverConversa(conversaId)
  if ('error' in r) return r
  const env = await enviarEnquete(r.instance, destinoDe(r.conv.numero), { pergunta, opcoes, escolhas: p.variasRespostas ? opcoes.length : 1 })
  if (!env.ok) return { error: 'Falha ao enviar a enquete pelo WhatsApp.' }
  const conteudo = `📊 ${pergunta}\n${opcoes.map(o => `◯ ${o}`).join('\n')}`
  await registrarSaida(r.service, r.conv, { role: 'human', content: conteudo, waId: idDoEnvio(env.data), waFromMe: true })
  return { success: true as const, conteudo }
}

/** Envia uma imagem como figurinha. */
export async function enviarFigurinhaConversa(conversaId: string, url: string) {
  const r = await resolverConversa(conversaId)
  if ('error' in r) return r
  const env = await enviarFigurinha(r.instance, destinoDe(r.conv.numero), url)
  if (!env.ok) return { error: 'Falha ao enviar a figurinha pelo WhatsApp.' }
  await registrarSaida(r.service, r.conv, { role: 'human', content: '😀 Figurinha', midia: { tipo: 'image', url }, waId: idDoEnvio(env.data), waFromMe: true })
  return { success: true as const }
}

/** Link do catálogo do WhatsApp Business da loja (wa.me/c/<número>), para mandar na conversa. */
export async function linkDoCatalogo() {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' }
  const numero = await numeroDaInstancia(instance)
  if (!numero) return { error: 'Não consegui descobrir o número do WhatsApp conectado.' }
  return { success: true as const, link: `https://wa.me/c/${numero}` }
}

/** Respostas rápidas (mensagens prontas) da loja. */
export async function listarRespostasRapidas(): Promise<{ id: string; titulo: string; texto: string }[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const { data } = await createServiceClient().from('mensagens_prontas').select('id, titulo, texto').eq('company_id', companyId).order('titulo')
  return (data ?? []) as { id: string; titulo: string; texto: string }[]
}

/** Todas as etiquetas já usadas na loja (as mesmas do Funil), para escolher na conversa. */
export async function etiquetasDaLoja(): Promise<string[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const service = createServiceClient()
  const linhas = await buscarTodos<{ tags: string[] | null }>(
    (de, ate) => service.from('contacts').select('tags').eq('company_id', companyId).not('tags', 'eq', '{}').order('id').range(de, ate) as never,
    'etiquetas da loja',
  )
  const todas = new Set<string>()
  for (const l of linhas) for (const t of l.tags ?? []) if (t?.trim()) todas.add(t.trim())
  return [...todas].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Define as etiquetas de uma conversa (gravadas no contato, então aparecem também no Funil).
 * Conversa de pessoa que ainda não é contato vira contato (lead) para poder receber etiqueta, como no WhatsApp Business.
 */
export async function definirEtiquetasConversa(conversaId: string, etiquetas: string[]) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const tags = [...new Set(etiquetas.map(t => t.trim().slice(0, 40)).filter(Boolean))].slice(0, 20)
  const service = createServiceClient()
  const { data: conv } = await service.from('conversations').select('id, numero, contact_id').eq('id', conversaId).eq('company_id', companyId).single()
  if (!conv) return { error: 'Conversa não encontrada.' }
  if (ehGrupo(conv.numero)) return { error: 'Grupos não recebem etiqueta.' }

  let contactId = conv.contact_id as string | null
  if (!contactId) {
    const existente = await acharContatoPorTelefone<{ id: string; phone: string | null }>(service, companyId, conv.numero)
    if (existente) contactId = existente.id
    else {
      const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
      const colunas = (comp?.settings as { funil_colunas?: { key: string }[] } | null)?.funil_colunas
      const { data: novo, error } = await service.from('contacts').insert({
        company_id: companyId, phone: conv.numero, origem: 'WhatsApp', funil_etapa: colunas?.[0]?.key ?? 'novo', active: true, criado_por: 'Conversas',
      } as never).select('id').single()
      if (error || !novo) return { error: 'Não foi possível criar o contato.' }
      contactId = (novo as { id: string }).id
    }
    await service.from('conversations').update({ contact_id: contactId }).eq('id', conv.id)
  }
  const { error } = await service.from('contacts').update({ tags } as never).eq('id', contactId).eq('company_id', companyId)
  if (error) return { error: 'Não foi possível salvar as etiquetas.' }
  revalidatePath('/dashboard/funil')
  return { success: true as const, tags, contactId }
}
