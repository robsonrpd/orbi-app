'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

/** Salva a configuração do assistente de IA (nome, contexto, telefone do dono, ativa/pausada). */
export async function salvarConfigIA(payload: {
  aiName: string
  aiContext: string
  ownerPhone: string
  ativa: boolean
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  settings.owner_phone = (payload.ownerPhone ?? '').replace(/\D/g, '') || undefined
  settings.ia_pausada = payload.ativa ? undefined : true

  const { error } = await service.from('companies').update({
    ai_name: payload.aiName?.trim() || 'Assistente',
    ai_context: payload.aiContext?.trim() || null,
    settings,
  }).eq('id', companyId)

  if (error) return { error: 'Erro ao salvar configuração.' }
  revalidatePath('/dashboard/ia')
  return { success: true }
}
