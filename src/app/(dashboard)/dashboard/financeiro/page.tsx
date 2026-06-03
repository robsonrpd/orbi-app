import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { MetricCard } from '@/components/orbi/metric-card'
import { FinanceiroClient } from './financeiro-client'
import { DollarSign, AlertCircle, Clock } from 'lucide-react'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: transactions }, { data: contacts }] = await Promise.all([
    service.from('transactions')
      .select('id, amount, status, due_date, created_at, contacts(id, name, phone)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    service.from('contacts').select('id, name, phone').eq('company_id', companyId).order('name'),
  ])

  const monthTx = (transactions ?? []).filter(t => t.created_at >= monthStart)
  const received = monthTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)
  const pending = monthTx.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0)
  const overdue = (transactions ?? []).filter(t => t.status === 'overdue').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Financeiro" subtitle="Controle de cobranças e recebimentos" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Recebido no mês" value={formatCurrency(received)} icon={DollarSign}
            iconColor="text-[#0DB57A]" iconBg="bg-[#E6F9F3]" />
          <MetricCard title="Pendente" value={formatCurrency(pending)} subtitle="Aguardando pagamento"
            icon={Clock} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
          <MetricCard title="Em atraso" value={formatCurrency(overdue)} subtitle="Clientes inadimplentes"
            icon={AlertCircle} iconColor="text-[#EF4444]" iconBg="bg-red-50" />
        </div>
        <FinanceiroClient
          transactions={(transactions ?? []) as never}
          contacts={contacts ?? []}
        />
      </div>
    </div>
  )
}
