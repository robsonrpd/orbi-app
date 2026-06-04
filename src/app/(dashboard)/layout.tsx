import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/orbi/sidebar'
import { SubscriptionManager } from '@/components/orbi/subscription-manager'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: userData } = await service
    .from('users')
    .select('company_id, created_at, companies(name, trial_ends_at, subscription_status, subscription_plan)')
    .eq('id', user.id)
    .single()

  const company = userData?.companies as {
    name?: string
    trial_ends_at?: string
    subscription_status?: string
    subscription_plan?: string
  } | null

  // Considera "novo usuário" se criado há menos de 1 hora
  const isNewUser = userData?.created_at
    ? (Date.now() - new Date(userData.created_at).getTime()) < 60 * 60 * 1000
    : false

  return (
    <div className="flex h-screen bg-[#F7F6F3] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <SubscriptionManager
          companyName={company?.name ?? 'Minha Ótica'}
          trialEndsAt={company?.trial_ends_at ?? null}
          subscriptionStatus={company?.subscription_status ?? 'trial'}
          subscriptionPlan={company?.subscription_plan ?? null}
          isNewUser={isNewUser}
        />
        {children}
      </main>
    </div>
  )
}
