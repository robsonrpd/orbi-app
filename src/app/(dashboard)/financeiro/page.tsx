import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { TransactionBadge } from '@/components/orbi/status-badge'
import { MetricCard } from '@/components/orbi/metric-card'
import { Button } from '@/components/ui/button'
import { DollarSign, AlertCircle, Clock, PlusCircle } from 'lucide-react'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const { data: transactions } = await service
    .from('transactions')
    .select('*, contacts(name, phone)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  const monthTx = (transactions ?? []).filter(t => t.created_at >= monthStart)
  const received = monthTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)
  const pending = monthTx.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0)
  const overdue = (transactions ?? []).filter(t => t.status === 'overdue').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Financeiro" subtitle="Controle de cobranças e recebimentos" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Recebido no mês" value={formatCurrency(received)} icon={DollarSign}
            iconColor="text-[#0DB57A]" iconBg="bg-[#E6F9F3]" trend={5} />
          <MetricCard title="Pendente" value={formatCurrency(pending)} subtitle="Aguardando pagamento"
            icon={Clock} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
          <MetricCard title="Em atraso" value={formatCurrency(overdue)} subtitle="Clientes inadimplentes"
            icon={AlertCircle} iconColor="text-[#EF4444]" iconBg="bg-red-50" />
        </div>

        {/* Tabela de transações */}
        <div className="bg-white rounded-xl border border-[#EAE8E1]">
          <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
              Cobranças
            </h2>
            <Button size="sm" className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
              <PlusCircle className="size-3.5" /> Nova cobrança
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EAE8E1]">
                {['Cliente', 'Valor', 'Vencimento', 'Status', 'Ação'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE8E1]">
              {(transactions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-[#C8C5BB]">
                    Nenhuma cobrança registrada ainda.
                  </td>
                </tr>
              ) : (
                (transactions ?? []).map((t: Record<string, unknown>) => {
                  const contact = t.contacts as { name?: string; phone?: string } | null
                  return (
                    <tr key={t.id as string} className="hover:bg-[#F7F6F3] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xs font-bold text-[#1A56FF]">
                            {(contact?.name ?? contact?.phone ?? '?')[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#1C1B18]">
                            {contact?.name ?? contact?.phone ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-[#1C1B18]">
                        {formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#8C8880]">
                        {t.due_date ? formatDate(t.due_date as string) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <TransactionBadge status={t.status as 'pending' | 'paid' | 'overdue' | 'cancelled'} />
                      </td>
                      <td className="px-5 py-3.5">
                        {(t.status === 'pending' || t.status === 'overdue') && (t.payment_link as string | null) && (
                          <Button variant="outline" size="sm" className="h-7 text-xs border-[#EAE8E1] text-[#1A56FF] hover:bg-[#EEF2FF]">
                            Enviar link
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
