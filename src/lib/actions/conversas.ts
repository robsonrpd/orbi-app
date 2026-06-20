'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarTexto } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: { tipo: string; url: string; nome?: string } }

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

/** Envia uma resposta manual pelo WhatsApp e registra na conversa. */
export async function responderConversa(conversaId: string, texto: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const limpo = texto.trim()
  if (!limpo) return { error: 'Digite uma mensagem.' }

  const service = createServiceClient()
  const { data: conv } = await service.from('conversations').select('id, numero, messages').eq('id', conversaId).eq('company_id', companyId).single()
  if (!conv) return { error: 'Conversa não encontrada.' }

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' }

  const env = await enviarTexto(instance, conv.numero, limpo)
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  const messages = [...((conv.messages as Msg[] | null) ?? []), { role: 'human' as const, content: limpo }].slice(-60)
  await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', conv.id)

  revalidatePath('/dashboard/conversas')
  return { success: true as const }
}
