'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

export async function saveParametrosVenda(regras: Record<string, boolean>) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  // Lê settings atual e mescla
  const { data: company } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (company?.settings ?? {}) as Record<string, unknown>
  settings.regras_venda = regras

  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar parâmetros.' }
  revalidatePath('/dashboard/parametros')
  return { success: true }
}
