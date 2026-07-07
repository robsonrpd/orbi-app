import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const IMPERSONATE_COOKIE = 'orbi_impersonate'

function superAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

/**
 * Retorna o company_id "efetivo":
 * - normalmente, a empresa do usuário logado
 * - se for super-admin e houver impersonation ativa, a empresa impersonada
 */
export async function getEffectiveCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user.id).single()
  const realId = userData?.company_id ?? null

  const cookieStore = await cookies()
  const imp = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (imp && user.email && superAdminEmails().includes(user.email.toLowerCase())) {
    return imp
  }
  return realId
}

/** Nome do usuário logado (para atribuir "quem inseriu" em cadastros feitos na UI). */
export async function getCurrentUserName(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('users').select('name').eq('id', user.id).single()
  return data?.name ?? null
}

/**
 * Se houver impersonation ativa (e o usuário for super-admin), retorna o nome da empresa.
 */
export async function getImpersonation(): Promise<{ companyName: string } | null> {
  const cookieStore = await cookies()
  const imp = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (!imp) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !superAdminEmails().includes(user.email.toLowerCase())) return null

  const service = createServiceClient()
  const { data: company } = await service.from('companies').select('name').eq('id', imp).single()
  return company ? { companyName: company.name } : null
}
