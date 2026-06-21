'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'
import { SITE_DEFAULT, type SiteConfig } from './site-types'

export async function getSiteConfig(): Promise<SiteConfig> {
  const companyId = await getCompanyId()
  if (!companyId) return SITE_DEFAULT
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const site = (data?.settings as { site?: Partial<SiteConfig> } | null)?.site ?? {}
  return { ...SITE_DEFAULT, ...site }
}

export async function saveSiteConfig(config: SiteConfig) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: current } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = { ...(current?.settings as Record<string, unknown> ?? {}), site: config }

  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar.' }

  revalidatePath('/dashboard/meu-site')
  return { success: true as const }
}
