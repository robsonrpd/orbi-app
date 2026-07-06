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

/** Salva a meta de faturamento mensal (usada em Relatórios > Financeiro). */
export async function salvarMetaMensal(valor: number) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (isNaN(valor) || valor < 0) return { error: 'Valor inválido.' }

  const service = createServiceClient()
  const { data: current } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = { ...(current?.settings as Record<string, unknown> ?? {}), meta_faturamento_mensal: valor }
  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar meta.' }

  revalidatePath('/dashboard/relatorios')
  return { success: true }
}
