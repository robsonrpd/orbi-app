import { createServiceClient } from '@/lib/supabase/server'
import { getSuperAdmin } from '@/lib/auth/super-admin'
import { FounderClient } from './founder-client'

const PLAN_PRICE: Record<string, number> = { individual: 97, equipe: 197, ilimitado: 297 }

export default async function FounderPage() {
  const admin = await getSuperAdmin()
  const service = createServiceClient()

  // Todas as empresas + contagem de usuários
  const { data: companies } = await service
    .from('companies')
    .select('id, name, slug, business_type, subscription_status, subscription_plan, trial_ends_at, created_at, active')
    .order('created_at', { ascending: false })

  // Conta clientes (contacts) e usuários por empresa para métricas de uso
  const { data: contactsCount } = await service.from('contacts').select('company_id')
  const usoMap: Record<string, number> = {}
  ;(contactsCount ?? []).forEach(c => { usoMap[c.company_id] = (usoMap[c.company_id] ?? 0) + 1 })

  const list = (companies ?? []).map(c => ({
    ...c,
    clientes: usoMap[c.id] ?? 0,
  }))

  // MRR estimado
  const mrr = list
    .filter(c => c.subscription_status === 'active')
    .reduce((s, c) => s + (PLAN_PRICE[c.subscription_plan ?? ''] ?? 97), 0)

  return (
    <FounderClient
      companies={list as never}
      mrr={mrr}
      adminEmail={admin?.email ?? ''}
    />
  )
}
