import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { MetricCard } from '@/components/orbi/metric-card'
import { AppointmentBadge } from '@/components/orbi/status-badge'
import { DollarSign, Calendar, Users, MessageSquare, Bot } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id, name, companies(name)').eq('id', user!.id).single()

  const companyId = userData?.company_id
  const companyName = (userData?.companies as { name?: string } | null)?.name ?? 'Minha Empresa'

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: transactions }, { data: appointments }, { data: contacts }, { data: conversations }] = await Promise.all([
    service.from('transactions').select('amount, status').eq('company_id', companyId).gte('created_at', monthStart),
    service.from('appointments').select('*, contacts(name, phone), services(name)').eq('company_id', companyId).gte('start_at', today + 'T00:00:00').lte('start_at', today + 'T23:59:59').order('start_at'),
    service.from('contacts').select('id', { count: 'exact' }).eq('company_id', companyId),
    service.from('conversations').select('*, contacts(name, phone)').eq('company_id', companyId).gte('last_message_at', today + 'T00:00:00').order('last_message_at', { ascending: false }).limit(5),
  ])

  const faturamento = (transactions ?? []).filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)
  const pendente = (transactions ?? []).filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0)
  const totalClientes = contacts?.length ?? 0
  const totalConversas = conversations?.length ?? 0
  const iaConversas = (conversations ?? []).filter(c => c.handled_by_ai).length

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Dashboard"
        subtitle={`${greeting}, ${userData?.name?.split(' ')[0] ?? 'usuário'}! Aqui está o resumo de hoje.`}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Faturamento do mês"
            value={formatCurrency(faturamento)}
            subtitle={pendente > 0 ? `+ ${formatCurrency(pendente)} pendente` : undefined}
            icon={DollarSign}
            iconColor="text-[#0DB57A]"
            iconBg="bg-[#E6F9F3]"
            trend={8}
          />
          <MetricCard
            title="Agendamentos hoje"
            value={String(appointments?.length ?? 0)}
            subtitle="Neste dia"
            icon={Calendar}
            iconColor="text-[#1A56FF]"
            iconBg="bg-[#EEF2FF]"
          />
          <MetricCard
            title="Total de clientes"
            value={String(totalClientes)}
            subtitle="Na base"
            icon={Users}
            iconColor="text-[#F59E0B]"
            iconBg="bg-[#FEF3C7]"
          />
          <MetricCard
            title="Conversas hoje"
            value={String(totalConversas)}
            subtitle={`${iaConversas} respondidas pela IA`}
            icon={MessageSquare}
            iconColor="text-[#1A56FF]"
            iconBg="bg-[#EEF2FF]"
          />
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Agenda do dia */}
          <div className="col-span-3 bg-white rounded-xl border border-[#EAE8E1]">
            <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                Agenda do dia
              </h2>
              <span className="text-xs text-[#8C8880]">{formatDate(new Date().toISOString())}</span>
            </div>
            <div className="divide-y divide-[#EAE8E1]">
              {(appointments ?? []).length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Calendar className="size-8 text-[#EAE8E1] mx-auto mb-2" />
                  <p className="text-sm text-[#8C8880]">Nenhum agendamento para hoje</p>
                </div>
              ) : (
                (appointments ?? []).map((appt: Record<string, unknown>) => {
                  const contact = appt.contacts as { name?: string; phone?: string } | null
                  const service = appt.services as { name?: string } | null
                  return (
                    <div key={appt.id as string} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#F7F6F3] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[48px]">
                          <p className="text-sm font-bold text-[#1C1B18]">{formatTime(appt.start_at as string)}</p>
                          <p className="text-xs text-[#8C8880]">{formatTime(appt.end_at as string)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1C1B18]">
                            {contact?.name ?? contact?.phone ?? '—'}
                          </p>
                          <p className="text-xs text-[#8C8880]">{service?.name ?? 'Serviço não definido'}</p>
                        </div>
                      </div>
                      <AppointmentBadge status={appt.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'} />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Conversas recentes */}
          <div className="col-span-2 bg-white rounded-xl border border-[#EAE8E1]">
            <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                Conversas recentes
              </h2>
              <Bot className="size-4 text-[#C8C5BB]" />
            </div>
            <div className="divide-y divide-[#EAE8E1]">
              {(conversations ?? []).length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <MessageSquare className="size-8 text-[#EAE8E1] mx-auto mb-2" />
                  <p className="text-sm text-[#8C8880]">Nenhuma conversa hoje</p>
                </div>
              ) : (
                (conversations ?? []).map((conv: Record<string, unknown>) => {
                  const contact = conv.contacts as { name?: string; phone?: string } | null
                  return (
                    <div key={conv.id as string} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#F7F6F3] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xs font-bold text-[#1A56FF]">
                          {(contact?.name ?? contact?.phone ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1C1B18]">
                            {contact?.name ?? contact?.phone ?? '—'}
                          </p>
                          <p className="text-xs text-[#8C8880]">
                            {formatTime(conv.last_message_at as string)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        conv.escalated_at ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        conv.handled_by_ai ? 'bg-[#EEF2FF] text-[#1A56FF] border-[#1A56FF]/20' :
                        'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {conv.escalated_at ? 'Escalada' : conv.handled_by_ai ? 'IA' : 'Humano'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
