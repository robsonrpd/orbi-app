'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id ?? null
}

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
