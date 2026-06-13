'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarTexto } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

type Msg = { role: 'user' | 'assistant' | 'human'; content: string }

/** Envia uma mensagem do atendente (humano) para o cliente, pelo WhatsApp, e registra na conversa. */
export async function responderConversa(conversaId: string, texto: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!texto.trim()) return { error: 'Digite uma mensagem.' }

  const service = createServiceClient()
  const { data: conv } = await service.from('conversations')
    .select('numero, messages').eq('id', conversaId).eq('company_id', companyId).single()
  if (!conv?.numero) return { error: 'Conversa não encontrada.' }

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string })?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' }

  const env = await enviarTexto(instance, conv.numero, texto.trim())
  if (!env.ok) return { error: 'Não foi possível enviar a mensagem pelo WhatsApp.' }

  const messages: Msg[] = [...((conv.messages as Msg[]) ?? []), { role: 'human', content: texto.trim() }]
  await service.from('conversations').update({
    messages: messages.slice(-60),
    handled_by_ai: false,
    last_message_at: new Date().toISOString(),
  }).eq('id', conversaId)

  revalidatePath('/dashboard/conversas')
  return { success: true }
}
