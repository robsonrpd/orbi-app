'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

/** Salva (ou remove) a logo da empresa. URL vem do /api/upload. */
export async function saveCompanyLogo(logoUrl: string | null) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('companies')
    .update({ logo_url: logoUrl }).eq('id', companyId)

  if (error) return { error: 'Erro ao salvar a logo.' }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
