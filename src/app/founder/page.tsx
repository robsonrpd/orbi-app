import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getSuperAdmin } from '@/lib/auth/super-admin'
import { FounderClient } from './founder-client'

const PLAN_PRICE: Record<string, number> = { individual: 97, equipe: 197, ilimitado: 297 }

export default async function FounderPage() {
  // SEGURANÇA: só super-admins podem ver o painel do fundador.
  // Sem este guard, qualquer usuário logado veria os dados de TODAS as empresas.
  const admin = await getSuperAdmin()
  if (!admin) notFound()

  const service = createServiceClient()

  const { data: companies } = await service
    .from('companies')
    .select('id, name, slug, business_type, subscription_status, subscription_plan, trial_ends_at, created_at, active, settings')
    .order('created_at', { ascending: false })

  // Clientes (contacts) por empresa
  const { data: contactsCount } = await service.from('contacts').select('company_id')
  const usoMap: Record<string, number> = {}
  ;(contactsCount ?? []).forEach(c => { usoMap[c.company_id] = (usoMap[c.company_id] ?? 0) + 1 })

  // E-mail do dono (admin) por empresa
  const { data: users } = await service.from('users').select('company_id, email, name').eq('role', 'admin')
  const ownerMap: Record<string, { email: string; name: string | null }> = {}
  ;(users ?? []).forEach(u => { if (!ownerMap[u.company_id]) ownerMap[u.company_id] = { email: u.email, name: u.name } })

  const list = (companies ?? []).map(c => {
    const settings = (c.settings ?? {}) as { owner_phone?: string }
    return {
      id: c.id, name: c.name, slug: c.slug, business_type: c.business_type,
      subscription_status: c.subscription_status, subscription_plan: c.subscription_plan,
      trial_ends_at: c.trial_ends_at, created_at: c.created_at, active: c.active,
      clientes: usoMap[c.id] ?? 0,
      owner_email: ownerMap[c.id]?.email ?? null,
      owner_name: ownerMap[c.id]?.name ?? null,
      owner_phone: settings.owner_phone ?? null,
    }
  })

  const mrr = list
    .filter(c => c.subscription_status === 'active')
    .reduce((s, c) => s + (PLAN_PRICE[c.subscription_plan ?? ''] ?? 97), 0)

  return <FounderClient companies={list as never} mrr={mrr} adminEmail={admin?.email ?? ''} />
}
