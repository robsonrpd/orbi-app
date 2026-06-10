import { createClient } from '@/lib/supabase/server'

/**
 * Retorna o e-mail do usuário logado se ele for super-admin (fundador), senão null.
 * Super-admins são definidos pela env var SUPER_ADMIN_EMAILS (separados por vírgula).
 */
export async function getSuperAdmin(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const allowed = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  if (allowed.length === 0) return null
  if (!allowed.includes(user.email.toLowerCase())) return null

  return { id: user.id, email: user.email }
}
