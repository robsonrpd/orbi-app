'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarTexto } from '@/lib/evolution'
import { FUNIL_KEYS } from '@/lib/funil'
import { revalidatePath } from 'next/cache'

function waNumero(phone: string) {
  const d = (phone || '').replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}

type Msg = { role: 'user' | 'assistant' | 'human'; content: string }

/** Envia mensagem ao lead pelo WhatsApp (a partir do CRM) e registra na conversa. */
export async function responderLead(contactId: string, texto: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!texto.trim()) return { error: 'Digite uma mensagem.' }

  const service = createServiceClient()
  const { data: contact } = await service.from('contacts').select('phone').eq('id', contactId).eq('company_id', companyId).single()
  if (!contact?.phone) return { error: 'Lead sem telefone.' }

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string })?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' }

  const numero = waNumero(contact.phone)
  const env = await enviarTexto(instance, numero, texto.trim())
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  // encontra ou cria a conversa (match pelos últimos 8 dígitos)
  const chave = numero.slice(-8)
  const { data: convs } = await service.from('conversations').select('id, numero, messages').eq('company_id', companyId)
  const conv = (convs ?? []).find(c => (c.numero ?? '').replace(/\D/g, '').slice(-8) === chave)
  const nova: Msg = { role: 'human', content: texto.trim() }

  if (conv) {
    const messages = [...((conv.messages as Msg[]) ?? []), nova].slice(-60)
    await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', conv.id)
  } else {
    await service.from('conversations').insert({
      company_id: companyId, contact_id: contactId, numero, messages: [nova],
      handled_by_ai: false, last_message_at: new Date().toISOString(),
    } as never)
  }

  revalidatePath('/dashboard/funil')
  return { success: true }
}

/** Atualiza os dados do lead (nome, e-mail, origem, valor, etapa, etiquetas, observações). */
export async function atualizarLead(contactId: string, p: {
  name?: string; email?: string; origem?: string; valor?: number; etapa?: string; tags?: string[]; notes?: string
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const patch: Record<string, unknown> = {}
  if (p.name !== undefined) patch.name = p.name.trim() || null
  if (p.email !== undefined) patch.email = p.email.trim() || null
  if (p.origem !== undefined) patch.origem = p.origem || null
  if (p.valor !== undefined) patch.funil_valor = isNaN(p.valor) ? 0 : p.valor
  if (p.etapa !== undefined && FUNIL_KEYS.includes(p.etapa)) patch.funil_etapa = p.etapa
  if (p.tags !== undefined) patch.tags = p.tags
  if (p.notes !== undefined) patch.notes = p.notes.trim() || null

  const service = createServiceClient()
  const { error } = await service.from('contacts').update(patch).eq('id', contactId).eq('company_id', companyId)
  if (error) return { error: 'Erro ao salvar.' }
  revalidatePath('/dashboard/funil')
  return { success: true }
}
