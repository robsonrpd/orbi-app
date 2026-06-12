'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { NICHO_KEYS } from '@/lib/nichos'
import { revalidatePath } from 'next/cache'

/** Define o ramo/nicho da empresa (adapta menus e termos). */
export async function salvarNicho(businessType: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!NICHO_KEYS.includes(businessType)) return { error: 'Ramo inválido.' }

  const service = createServiceClient()
  const { error } = await service.from('companies')
    .update({ business_type: businessType }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar o ramo.' }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Salva (ou remove) a logo da empresa. URL vem do /api/upload. */
export async function saveCompanyLogo(logoUrl: string | null) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  // Só aceita URL https (vinda do /api/upload) ou remoção (null)
  const url = logoUrl && /^https:\/\/.+/i.test(logoUrl) && logoUrl.length <= 500 ? logoUrl : null

  const service = createServiceClient()
  const { error } = await service.from('companies')
    .update({ logo_url: url }).eq('id', companyId)

  if (error) return { error: 'Erro ao salvar a logo.' }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
