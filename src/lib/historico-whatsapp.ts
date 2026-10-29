import { createServiceClient } from '@/lib/supabase/server'
import { extrairConteudo } from '@/lib/whatsapp-mensagem'

type Service = ReturnType<typeof createServiceClient>

// Importação do HISTÓRICO que o WhatsApp entrega quando um aparelho é pareado (evento MESSAGES_SET).
//
// Regras, e por quê:
//  - só conversas INDIVIDUAIS. Grupo pode ter milhares de mensagens de gente que não é cliente.
//  - chat identificado só por código interno (@lid) SEM o telefone real é ignorado: não dá pra responder
//    nem casar com um lead (o histórico do WhatsApp nem sempre traz o telefone junto).
//  - conversa/lead que JÁ existe: o histórico é mesclado nela (sem duplicar, em ordem de hora).
//  - gente nova só vira lead se escreveu nos últimos 90 dias e ao menos uma mensagem foi do CLIENTE.
//    Uma loja com anos de WhatsApp teria milhares de contatos antigos entupindo o funil.
//  - nada dispara automação: conversas novas nascem "inertes" (boas-vindas, alerta de demora e
//    cobrança marcados como já feitos). Mensagem de cliente de meses atrás não pode virar atendimento.
//  - mídia antiga NÃO é baixada (os links do WhatsApp vencem): aparece o rótulo "📷 Imagem", "🎤 Áudio"...

export const DIAS_PARA_VIRAR_LEAD = 90
const MAX_CHATS_POR_CHAMADA = 600
const ORCAMENTO_MS = 48_000
const SIMULTANEOS = 6

type Msg = {
  role: 'user' | 'human'; content: string; ts: string; waId: string; waFromMe: boolean
  status?: 'sent' | 'delivered' | 'read'
}

type Chat = {
  numero: string
  msgs: Msg[]
  nome: string | null
  temEntrada: boolean
  temSaida: boolean
}

export type ResumoImportacao = {
  chatsRecebidos: number
  mensagensLidas: number
  conversasMescladas: number
  mensagensNovas: number
  leadsCriados: number
  semLeadPorIdade: number
  ignoradosGrupo: number
  ignoradosSemTelefone: number
  naoProcessadosPorTempo: number
  erros: number
}

const MESES_2009 = Date.UTC(2009, 0, 1)

/** Segundos do WhatsApp -> ISO. Devolve null se for lixo (a importação não pode inventar hora). */
function horaDoHistorico(ts: unknown): string | null {
  let seg = NaN
  if (typeof ts === 'number') seg = ts
  else if (typeof ts === 'string') seg = Number(ts)
  else if (ts && typeof ts === 'object' && 'low' in ts) seg = Number((ts as { low: number }).low)
  const ms = seg * 1000
  if (!Number.isFinite(ms) || ms < MESES_2009 || ms > Date.now() + 5 * 60_000) return null
  return new Date(ms).toISOString()
}

function statusDoWhatsApp(s: unknown): Msg['status'] | undefined {
  if (typeof s === 'number') return s === 2 ? 'sent' : s === 3 ? 'delivered' : s >= 4 ? 'read' : undefined
  const t = String(s ?? '').toUpperCase()
  return t === 'SERVER_ACK' ? 'sent' : t === 'DELIVERY_ACK' ? 'delivered' : (t === 'READ' || t === 'PLAYED') ? 'read' : undefined
}

async function emLotes<T>(itens: T[], n: number, fn: (x: T) => Promise<void>, limiteMs: number, inicio: number) {
  let i = 0, naoFeitos = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < itens.length) {
      const atual = itens[i++]
      if (Date.now() - inicio > limiteMs) { naoFeitos++; continue }
      await fn(atual)
    }
  }))
  return naoFeitos
}

export async function importarHistorico(
  service: Service,
  empresa: { id: string; settings?: Record<string, unknown> | null },
  raw: unknown,
): Promise<ResumoImportacao> {
  const inicio = Date.now()
  const lista = (Array.isArray(raw) ? raw : (raw as { messages?: unknown[] } | null)?.messages ?? []) as {
    key?: { id?: string; remoteJid?: string; remoteJidAlt?: string; fromMe?: boolean }
    message?: unknown; messageTimestamp?: unknown; pushName?: string; status?: unknown
  }[]

  const r: ResumoImportacao = {
    chatsRecebidos: 0, mensagensLidas: 0, conversasMescladas: 0, mensagensNovas: 0, leadsCriados: 0,
    semLeadPorIdade: 0, ignoradosGrupo: 0, ignoradosSemTelefone: 0, naoProcessadosPorTempo: 0, erros: 0,
  }

  // 1) agrupa por conversa
  const chats = new Map<string, Chat>()
  const gruposVistos = new Set<string>(), semTelVistos = new Set<string>()
  for (const m of lista) {
    const id = m.key?.id, jid = m.key?.remoteJid ?? ''
    if (!id || !jid) continue
    if (jid.endsWith('@g.us')) { gruposVistos.add(jid); continue }
    if (jid.endsWith('@broadcast') || jid.endsWith('@newsletter') || jid === 'status@broadcast') continue

    let tel = jid
    if (jid.endsWith('@lid')) {
      const alt = m.key?.remoteJidAlt ?? ''
      if (!alt.endsWith('@s.whatsapp.net')) { semTelVistos.add(jid); continue }
      tel = alt
    }
    const numero = tel.split('@')[0].replace(/\D/g, '')
    if (numero.length < 10 || numero.length > 15) continue

    const { conteudo } = extrairConteudo(m.message)
    const ts = horaDoHistorico(m.messageTimestamp)
    if (!conteudo || !ts) continue

    const fromMe = !!m.key?.fromMe
    const c = chats.get(numero) ?? { numero, msgs: [], nome: null, temEntrada: false, temSaida: false }
    c.msgs.push({
      role: fromMe ? 'human' : 'user', content: conteudo, ts, waId: id, waFromMe: fromMe,
      ...(fromMe && statusDoWhatsApp(m.status) ? { status: statusDoWhatsApp(m.status) } : {}),
    })
    if (fromMe) c.temSaida = true; else { c.temEntrada = true; if (!c.nome && m.pushName?.trim()) c.nome = m.pushName.trim() }
    chats.set(numero, c)
    r.mensagensLidas++
  }
  r.ignoradosGrupo = gruposVistos.size
  r.ignoradosSemTelefone = semTelVistos.size

  let todos = [...chats.values()]
  r.chatsRecebidos = todos.length
  if (todos.length > MAX_CHATS_POR_CHAMADA) { r.naoProcessadosPorTempo += todos.length - MAX_CHATS_POR_CHAMADA; todos = todos.slice(0, MAX_CHATS_POR_CHAMADA) }
  if (!todos.length) return r

  // 2) o que já existe: contatos (pelos 8 últimos dígitos) e conversas
  const contatoPorChave = new Map<string, { id: string; phone: string }>()
  const convPorNumero = new Map<string, string>()
  const convPorContato = new Map<string, string>()
  const LOTE = 150
  for (let i = 0; i < todos.length; i += LOTE) {
    const fatia = todos.slice(i, i + LOTE)
    const { data: cts } = await service.rpc('contatos_por_chaves', { p_company: empresa.id, p_chaves: fatia.map(c => c.numero.slice(-8)) })
    for (const c of (cts ?? []) as { id: string; phone: string; chave: string }[]) contatoPorChave.set(c.chave, { id: c.id, phone: c.phone })
    const { data: cv } = await service.from('conversations').select('id, numero, contact_id')
      .eq('company_id', empresa.id).in('numero', fatia.map(c => c.numero))
    for (const x of (cv ?? []) as { id: string; numero: string; contact_id: string | null }[]) {
      convPorNumero.set(x.numero, x.id)
      if (x.contact_id) convPorContato.set(x.contact_id, x.id)
    }
  }
  // conversa que existe ligada a um contato cujo número está gravado de outro jeito
  const idsContatos = [...new Set(todos.map(c => contatoPorChave.get(c.numero.slice(-8))?.id).filter(Boolean) as string[])]
  for (let i = 0; i < idsContatos.length; i += LOTE) {
    const { data: cv } = await service.from('conversations').select('id, contact_id')
      .eq('company_id', empresa.id).in('contact_id', idsContatos.slice(i, i + LOTE))
    for (const x of (cv ?? []) as { id: string; contact_id: string }[]) convPorContato.set(x.contact_id, x.id)
  }

  // 3) decide o que fazer com cada conversa
  const limiteLead = Date.now() - DIAS_PARA_VIRAR_LEAD * 86_400_000
  const colunas = (empresa.settings as { funil_colunas?: { key: string }[] } | null | undefined)?.funil_colunas
  const agora = new Date().toISOString()
  const mesclar: { conversationId: string; msgs: Msg[] }[] = []
  const criarConversaDe: { chat: Chat; contactId: string }[] = []
  const novosLeads: Chat[] = []

  for (const chat of todos) {
    chat.msgs.sort((a, b) => a.ts.localeCompare(b.ts))
    const contato = contatoPorChave.get(chat.numero.slice(-8))
    const convId = convPorNumero.get(chat.numero) ?? (contato ? convPorContato.get(contato.id) : undefined)
    if (convId) { mesclar.push({ conversationId: convId, msgs: chat.msgs }); continue }
    if (contato) { criarConversaDe.push({ chat, contactId: contato.id }); continue }
    const ultima = new Date(chat.msgs[chat.msgs.length - 1].ts).getTime()
    if (chat.temEntrada && ultima >= limiteLead) novosLeads.push(chat); else r.semLeadPorIdade++
  }

  // 4) cria os leads novos (em lotes) e junta com os que só precisam de conversa
  for (let i = 0; i < novosLeads.length; i += 100) {
    const fatia = novosLeads.slice(i, i + 100)
    const { data, error } = await service.from('contacts').insert(fatia.map(c => ({
      company_id: empresa.id, name: c.nome, phone: c.numero, origem: 'WhatsApp',
      // quem já foi atendido pela loja entra em "Em Atendimento" (coluna padrão); com colunas personalizadas, na 1ª
      funil_etapa: c.temSaida && !colunas?.length ? 'atendimento' : (colunas?.[0]?.key ?? 'novo'),
      active: true, criado_por: 'Histórico do WhatsApp', created_at: c.msgs[0].ts,
    })) as never).select('id, phone')
    if (error) { console.error('[historico leads]', error.message); r.erros++; continue }
    const idPorTel = new Map((data as { id: string; phone: string }[]).map(x => [x.phone, x.id]))
    for (const c of fatia) { const id = idPorTel.get(c.numero); if (id) { criarConversaDe.push({ chat: c, contactId: id }); r.leadsCriados++ } }
  }

  // conversas novas "inertes": nenhuma automação pode tratar histórico antigo como atendimento de hoje
  for (let i = 0; i < criarConversaDe.length; i += 100) {
    const fatia = criarConversaDe.slice(i, i + 100)
    const { data, error } = await service.from('conversations').insert(fatia.map(({ chat, contactId }) => ({
      company_id: empresa.id, contact_id: contactId, numero: chat.numero, messages: [],
      last_message_at: chat.msgs[chat.msgs.length - 1].ts, handled_by_ai: false,
      fluxo_etapa: 99, followup_etapa: 99, followup_ultimo_em: agora, sla_alertado_em: agora, sla_transferido_em: agora,
    })) as never).select('id, numero')
    if (error) { console.error('[historico conversas]', error.message); r.erros++; continue }
    const porNumero = new Map(fatia.map(x => [x.chat.numero, x.chat]))
    for (const c of (data ?? []) as { id: string; numero: string }[]) { const chat = porNumero.get(c.numero); if (chat) mesclar.push({ conversationId: c.id, msgs: chat.msgs }) }
  }

  // 5) mescla as mensagens (atômico, no banco)
  r.naoProcessadosPorTempo += await emLotes(mesclar, SIMULTANEOS, async ({ conversationId, msgs }) => {
    const { data, error } = await service.rpc('mesclar_mensagens', { p_conversation: conversationId, p_msgs: msgs, p_ativas: 40 })
    if (error) { console.error('[historico mesclar]', error.message); r.erros++; return }
    r.conversasMescladas++
    r.mensagensNovas += Number(data) || 0
  }, ORCAMENTO_MS, inicio)

  return r
}
