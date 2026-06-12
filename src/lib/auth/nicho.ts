import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from './company'
import { nichoEsconde } from '@/lib/nichos'

/** Redireciona se o módulo (href) não pertence ao nicho da empresa. */
export async function guardNicho(href: string) {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return
  const service = createServiceClient()
  const { data } = await service.from('companies').select('business_type').eq('id', companyId).single()
  if (nichoEsconde(data?.business_type).includes(href)) redirect('/dashboard')
}
