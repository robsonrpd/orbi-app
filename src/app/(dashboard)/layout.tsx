import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId, getImpersonation } from '@/lib/auth/company'
import { getModo } from '@/lib/auth/modo'
import { nichoEsconde } from '@/lib/nichos'
import { Sidebar } from '@/components/orbi/sidebar'
import { SubscriptionManager } from '@/components/orbi/subscription-manager'
import { ImpersonationBanner } from '@/components/orbi/impersonation-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()
  const impersonation = await getImpersonation()

  const { data: company } = await service
    .from('companies')
    .select('name, trial_ends_at, subscription_status, subscription_plan, logo_url, business_type')
    .eq('id', companyId)
    .single()
  const esconderNicho = nichoEsconde(company?.business_type)

  const modo = await getModo()
  const { data: vendedoresList } = await service
    .from('vendedores').select('id, nome').eq('company_id', companyId).eq('active', true).order('nome')

  // Novo usuário só vale para a própria conta (não em modo suporte)
  const { data: userRow } = await service.from('users').select('created_at').eq('id', user.id).single()
  const isNewUser = !impersonation && userRow?.created_at
    ? (Date.now() - new Date(userRow.created_at).getTime()) < 60 * 60 * 1000
    : false

  return (
    <div className="flex h-screen bg-[#F7F6F3] overflow-hidden">
      <Sidebar companyName={company?.name ?? 'Minha Empresa'} logoUrl={company?.logo_url ?? null} canEditLogo={!impersonation && modo.fonte !== 'login'} modo={modo} vendedores={vendedoresList ?? []} esconderNicho={esconderNicho} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {impersonation && <ImpersonationBanner companyName={impersonation.companyName} />}
        {!impersonation && (
          <SubscriptionManager
            companyName={company?.name ?? 'Minha Ótica'}
            trialEndsAt={company?.trial_ends_at ?? null}
            subscriptionStatus={company?.subscription_status ?? 'trial'}
            subscriptionPlan={company?.subscription_plan ?? null}
            isNewUser={isNewUser}
          />
        )}
        {children}
      </main>
    </div>
  )
}
