'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarTexto, enviarMedia, enviarAudio, statusInstancia } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

type Midia = { tipo: string; url: string; nome?: string }
type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: Midia; ts?: string }

export type ConversaResumo = {
  id: string
  numero: string
  contactId: string | null
  contactName: string | null
  lastMessageAt: string | null
  handledByAi: boolean
  ultimaMensagem: string
}

/** Lista todas as conversas da empresa, mais recentes primeiro. */
export async function listarConversas(): Promise<ConversaResumo[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []

  const service = createServiceClient()
  const { data: convs } = await service
    .from('conversations')
    .select('id, numero, contact_id, messages, last_message_at, handled_by_ai')
    .eq('company_id', companyId)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const contactIds = [...new Set((convs ?? []).map(c => c.contact_id).filter(Boolean))] as string[]
  const { data: contacts } = contactIds.length
    ? await service.from('contacts').select('id, name').in('id', contactIds)
    : { data: [] }
  const nomePorId = new Map((contacts ?? []).map(c => [c.id, c.name]))

  return (convs ?? []).map(c => {
    const msgs = (c.messages as Msg[] | null) ?? []
    const ultima = msgs[msgs.length - 1]
    return {
      id: c.id,
      numero: c.numero,
      contactId: c.contact_id,
      contactName: c.contact_id ? nomePorId.get(c.contact_id) ?? null : null,
      lastMessageAt: c.last_message_at,
      handledByAi: !!c.handled_by_ai,
      ultimaMensagem: ultima ? (ultima.midia ? `📎 ${ultima.midia.tipo}` : ultima.content) : '',
    }
  })
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
  if (st.state !== 'open') return { error: 'O WhatsApp desconectou. Vá em Conexão & IA e escaneie o QR Code de novo pra reconectar.' as const }

  return { service, conv, instance }
}

async function registrarSaida(service: ReturnType<typeof createServiceClient>, conv: { id: string; messages: unknown }, msg: Msg) {
  const comTimestamp = { ...msg, ts: msg.ts ?? new Date().toISOString() }
  const messages = [...((conv.messages as Msg[] | null) ?? []), comTimestamp].slice(-60)
  await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', conv.id)
  revalidatePath('/dashboard/conversas')
}

/** Envia uma resposta manual de texto pelo WhatsApp e registra na conversa. */
export async function responderConversa(conversaId: string, texto: string) {
  const limpo = texto.trim()
  if (!limpo) return { error: 'Digite uma mensagem.' }

  const r = await resolverConversa(conversaId)
  if ('error' in r) return r

  const env = await enviarTexto(r.instance, r.conv.numero, limpo)
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  await registrarSaida(r.service, r.conv, { role: 'human', content: limpo })
  return { success: true as const }
}

/** Inicia uma conversa nova com um número que ainda não tem conversa registrada (ex: a partir da ficha do cliente). */
export async function iniciarConversa(numero: string, texto: string) {
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
  if (st.state !== 'open') return { error: 'O WhatsApp desconectou. Vá em Conexão & IA e escaneie o QR Code de novo pra reconectar.' }

  const { data: convs } = await service.from('conversations').select('id, numero, messages').eq('company_id', companyId)
  const existente = (convs ?? []).find(c => (c.numero ?? '').replace(/\D/g, '').slice(-8) === chave)

  const env = await enviarTexto(instance, numeroFmt, limpo)
  if (!env.ok) {
    const d = env.data as { message?: string | string[]; error?: string; response?: { message?: string | string[] } } | null
    const detalhe = d?.response?.message ?? d?.message ?? d?.error ?? (typeof d === 'string' ? d : null)
    const texto = Array.isArray(detalhe) ? detalhe.join(' ') : detalhe
    return { error: `Falha ao enviar pelo WhatsApp${env.status ? ` (${env.status})` : ''}${texto ? `: ${texto}` : '.'}` }
  }

  const nova: Msg = { role: 'human', content: limpo, ts: new Date().toISOString() }

  if (existente) {
    const messages = [...((existente.messages as Msg[] | null) ?? []), nova].slice(-60)
    await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', existente.id)
    revalidatePath('/dashboard/conversas')
    return { success: true as const, conversaId: existente.id }
  }

  const { data: contacts } = await service.from('contacts').select('id, phone').eq('company_id', companyId)
  const contact = (contacts ?? []).find(c => (c.phone ?? '').replace(/\D/g, '').slice(-8) === chave)

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

  const env = await enviarMedia(r.instance, r.conv.numero, { mediatype: p.mediatype, media: p.url, fileName: p.fileName })
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  await registrarSaida(r.service, r.conv, { role: 'human', content: p.fileName || 'Arquivo', midia: { tipo: p.mediatype, url: p.url, nome: p.fileName } })
  return { success: true as const }
}

/** Envia um áudio de voz (já hospedado em uma URL pública) pelo WhatsApp. */
export async function enviarAudioConversa(conversaId: string, url: string) {
  const r = await resolverConversa(conversaId)
  if ('error' in r) return r

  const env = await enviarAudio(r.instance, r.conv.numero, url)
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  await registrarSaida(r.service, r.conv, { role: 'human', content: '🎤 Áudio', midia: { tipo: 'audio', url } })
  return { success: true as const }
}
