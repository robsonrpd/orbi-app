import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const IMPERSONATE_COOKIE = 'orbi_impersonate'
export const ACTIVE_COMPANY_COOKIE = 'orbi_active_company'

function superAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

/**
 * Retorna o company_id "efetivo":
 * - normalmente, a empresa do usuário logado
 * - se for super-admin e houver impersonation ativa, a empresa impersonada
 * - se o dono tiver mais de uma empresa vinculada ao login (company_members),
 *   respeita a empresa escolhida no cookie ACTIVE_COMPANY_COOKIE (validada)
 * - funcionário com login próprio (role='staff') NUNCA troca de empresa
 */
export async function getEffectiveCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id, role').eq('id', user.id).single()
  const defaultId = userData?.company_id ?? null

  const cookieStore = await cookies()

  // impersonação de super-admin sempre tem prioridade
  const imp = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (imp && user.email && superAdminEmails().includes(user.email.toLowerCase())) {
    return imp
  }

  // vendedor com login próprio nunca troca de empresa
  if (userData?.role === 'staff') return defaultId

  // dono: pode ter mais de uma empresa vinculada ao mesmo login
  const { data: memberships } = await service.from('company_members' as never)
    .select('company_id').eq('user_id', user.id).order('created_at', { ascending: true })
  const ids = ((memberships ?? []) as { company_id: string }[]).map(m => m.company_id)
  if (ids.length === 0) return defaultId
  if (ids.length === 1) return ids[0]

  const active = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value
  if (active && ids.includes(active)) return active
  return ids[0]
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
