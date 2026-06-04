import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { MetricCard } from '@/components/orbi/metric-card'
import { AppointmentBadge } from '@/components/orbi/status-badge'
import { DollarSign, Calendar, Users, MessageSquare, Bot, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
  const { data: userData } = await service
    .from('users').select('company_id, name, companies(name)').eq('id', user!.id).single()

  const companyId = userData?.company_id
  const companyName = (userData?.companies as { name?: string } | null)?.name ?? 'Minha Ótica'
  const firstName = userData?.name?.split(' ')[0] ?? 'usuário'

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const [{ data: transactions }, { data: appointments }, { data: contacts }, { data: conversations }] =
    await Promise.all([
      service.from('transactions').select('amount, status').eq('company_id', companyId).gte('created_at', monthStart),
      service.from('appointments').select('*, contacts(name, phone), services(name)').eq('company_id', companyId)
        .gte('start_at', today + 'T00:00:00').lte('start_at', today + 'T23:59:59').order('start_at'),
      service.from('contacts').select('id', { count: 'exact' }).eq('company_id', companyId),
      service.from('conversations').select('*, contacts(name, phone)').eq('company_id', companyId)
        .gte('last_message_at', today + 'T00:00:00').order('last_message_at', { ascending: false }).limit(6),
    ])

  const faturamento = (transactions ?? []).filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)
  const pendente = (transactions ?? []).filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0)
  const totalClientes = contacts?.length ?? 0
  const totalConversas = conversations?.length ?? 0
  const iaConversas = (conversations ?? []).filter(c => c.handled_by_ai).length

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F7F6F3]">
      <Topbar title="Dashboard" subtitle={`${greeting}, ${firstName}! Aqui está o resumo de hoje.`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Boas-vindas */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#8C8880] uppercase tracking-widest"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              {companyName}
            </p>
            <p className="text-xs text-[#C8C5BB] mt-0.5">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Faturamento do mês"
            value={formatCurrency(faturamento)}
            subtitle={pendente > 0 ? `+ ${formatCurrency(pendente)} pendente` : 'Nenhum pendente'}
            icon={DollarSign}
            iconColor="text-[#0DB57A]" iconBg="bg-[#E6F9F3]"
            trend={8} accent="#0DB57A"
          />
          <MetricCard
            title="Agendamentos hoje"
            value={String(appointments?.length ?? 0)}
            subtitle={appointments?.length === 1 ? '1 cliente aguardando' : `${appointments?.length ?? 0} clientes no dia`}
            icon={Calendar}
            iconColor="text-[#1A56FF]" iconBg="bg-[#EEF2FF]"
            accent="#1A56FF"
          />
          <MetricCard
            title="Total de clientes"
            value={String(totalClientes)}
            subtitle="Na sua base"
            icon={Users}
            iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]"
            accent="#F59E0B"
          />
          <MetricCard
            title="Conversas hoje"
            value={String(totalConversas)}
            subtitle={`${iaConversas} respondidas pela IA`}
            icon={MessageSquare}
            iconColor="text-[#8B5CF6]" iconBg="bg-purple-50"
            accent="#8B5CF6"
          />
        </div>

        {/* Conteúdo principal */}
        <div className="grid grid-cols-5 gap-4">

          {/* Agenda do dia */}
          <div className="col-span-3 bg-white rounded-xl border border-[#EAE8E1]"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                  <Calendar className="size-3.5 text-[#1A56FF]" strokeWidth={1.5} />
                </div>
                <h2 className="text-sm font-black text-[#1C1B18]"
                  style={{ fontFamily: 'Fraunces, serif' }}>
                  Agenda do dia
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8C8880]">{formatDate(new Date().toISOString())}</span>
                <Link href="/dashboard/agenda"
                  className="flex items-center gap-1 text-xs text-[#1A56FF] font-medium hover:underline">
                  Ver tudo <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-[#EAE8E1]">
              {(appointments ?? []).length === 0 ? (
                <div className="px-5 py-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#F7F6F3] flex items-center justify-center">
                    <Calendar className="size-5 text-[#EAE8E1]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#8C8880]">Dia livre por enquanto</p>
                    <p className="text-xs text-[#C8C5BB] mt-0.5">Nenhum agendamento para hoje</p>
                  </div>
                </div>
              ) : (
                (appointments ?? []).map((appt: Record<string, unknown>) => {
                  const contact = appt.contacts as { name?: string; phone?: string } | null
                  const svc = appt.services as { name?: string } | null
                  const startHour = new Date(appt.start_at as string).getHours()
                  const isNow = startHour === new Date().getHours()
                  return (
                    <div key={appt.id as string}
                      className={`px-5 py-3.5 flex items-center justify-between transition-colors ${isNow ? 'bg-[#EEF2FF]/50' : 'hover:bg-[#F7F6F3]'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`text-center min-w-[52px] px-2 py-1.5 rounded-lg ${isNow ? 'bg-[#1A56FF]' : 'bg-[#F7F6F3]'}`}>
                          <p className={`text-sm font-black leading-none ${isNow ? 'text-white' : 'text-[#1C1B18]'}`}
                            style={{ fontFamily: 'Fraunces, serif' }}>
                            {formatTime(appt.start_at as string)}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${isNow ? 'text-white/70' : 'text-[#C8C5BB]'}`}>
                            {formatTime(appt.end_at as string)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1C1B18]">
                            {contact?.name ?? contact?.phone ?? '—'}
                          </p>
                          <p className="text-xs text-[#8C8880]">{svc?.name ?? 'Atendimento'}</p>
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
          <div className="col-span-2 bg-white rounded-xl border border-[#EAE8E1]"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Bot className="size-3.5 text-purple-500" strokeWidth={1.5} />
                </div>
                <h2 className="text-sm font-black text-[#1C1B18]"
                  style={{ fontFamily: 'Fraunces, serif' }}>
                  IA hoje
                </h2>
              </div>
              <Link href="/dashboard/conversas"
                className="flex items-center gap-1 text-xs text-[#1A56FF] font-medium hover:underline">
                Ver tudo <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="divide-y divide-[#EAE8E1]">
              {(conversations ?? []).length === 0 ? (
                <div className="px-5 py-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#F7F6F3] flex items-center justify-center">
                    <MessageSquare className="size-5 text-[#EAE8E1]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#8C8880]">Silêncio total</p>
                    <p className="text-xs text-[#C8C5BB] mt-0.5">Nenhuma conversa hoje</p>
                  </div>
                </div>
              ) : (
                (conversations ?? []).map((conv: Record<string, unknown>) => {
                  const contact = conv.contacts as { name?: string; phone?: string } | null
                  const name = contact?.name ?? contact?.phone ?? '?'
                  const isEscalated = !!conv.escalated_at
                  const isAI = conv.handled_by_ai && !isEscalated
                  return (
                    <div key={conv.id as string}
                      className="px-5 py-3 flex items-center justify-between hover:bg-[#F7F6F3] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: isEscalated ? '#FEF3C7' : isAI ? '#EEF2FF' : '#F7F6F3',
                            color: isEscalated ? '#F59E0B' : isAI ? '#1A56FF' : '#8C8880',
                          }}>
                          {name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1C1B18] leading-none">{name}</p>
                          <p className="text-xs text-[#C8C5BB] mt-0.5">{formatTime(conv.last_message_at as string)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide`}
                        style={{
                          fontFamily: 'Barlow, sans-serif',
                          background: isEscalated ? '#FEF3C7' : isAI ? '#EEF2FF' : '#F7F6F3',
                          color: isEscalated ? '#F59E0B' : isAI ? '#1A56FF' : '#8C8880',
                        }}>
                        {isEscalated ? 'Escalada' : isAI ? 'IA' : 'Humano'}
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
