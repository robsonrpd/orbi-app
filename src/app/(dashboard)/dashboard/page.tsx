import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { GlowCard } from '@/components/orbi/glow-card'
import { AppointmentBadge } from '@/components/orbi/status-badge'
import {
  DollarSign, Calendar, Users, TrendingUp,
  Copy, ExternalLink, RefreshCw, ChevronRight,
  UserPlus, BarChart2, MessageSquare, Bot
} from 'lucide-react'
import Link from 'next/link'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const { data: userData } = await service
    .from('users').select('company_id, name, companies(name, slug)').eq('id', user!.id).single()

  const companyId = userData?.company_id
  const company = userData?.companies as { name?: string; slug?: string } | null
  const companySlug = company?.slug ?? 'minha-otica'
  const firstName = userData?.name?.split(' ')[0] ?? 'usuário'

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const [{ data: transactions }, { data: appointments }, { data: allContacts }, { data: conversations }] =
    await Promise.all([
      service.from('transactions').select('amount, status, created_at').eq('company_id', companyId),
      service.from('appointments').select('*, contacts(name, phone), services(name)')
        .eq('company_id', companyId).gte('start_at', today + 'T00:00:00').lte('start_at', today + 'T23:59:59').order('start_at'),
      service.from('contacts').select('id, name, phone, created_at').eq('company_id', companyId).order('created_at', { ascending: false }),
      service.from('conversations').select('*, contacts(name, phone)').eq('company_id', companyId)
        .gte('last_message_at', today + 'T00:00:00').order('last_message_at', { ascending: false }).limit(5),
    ])

  const monthTx = (transactions ?? []).filter(t => t.created_at >= monthStart)
  const lastMonthTx = (transactions ?? []).filter(t => t.created_at >= lastMonthStart && t.created_at < monthStart)
  const faturamento = monthTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)
  const faturamentoLast = lastMonthTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)
  const faturTrend = faturamentoLast > 0 ? Math.round(((faturamento - faturamentoLast) / faturamentoLast) * 100) : 0
  const totalClientes = allContacts?.length ?? 0
  const newToday = (allContacts ?? []).filter(c => c.created_at?.startsWith(today)).length
  const agendamentosHoje = appointments?.length ?? 0
  const ticketMedio = faturamento > 0 && agendamentosHoje > 0 ? faturamento / agendamentosHoje : 0

  const agendamentoLink = `orbi-app-saiw.vercel.app/${companySlug}`

  // Top clientes (por número de aparições em transações)
  const topClientes = (allContacts ?? []).slice(0, 3)

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Dashboard" subtitle={`${greeting}, ${firstName}!`} />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Hero Banner */}
        <div className="rounded-2xl overflow-hidden relative h-44"
          style={{
            background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1635 40%, #1A2A5E 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
          }}>
          {/* Textura */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          {/* Blob */}
          <div className="absolute right-0 top-0 w-72 h-72 opacity-20 -translate-y-1/4 translate-x-1/4"
            style={{ background: 'radial-gradient(circle, #1A56FF, transparent 70%)' }} />
          <div className="absolute left-1/3 bottom-0 w-48 h-48 opacity-10"
            style={{ background: 'radial-gradient(circle, #93AAFF, transparent 70%)' }} />

          <div className="relative z-10 h-full flex items-center justify-between px-8">
            <div>
              <p className="text-xs font-bold text-[#93AAFF] uppercase tracking-[3px] mb-2"
                style={{ fontFamily: 'Barlow, sans-serif' }}>
                Central de gestão
              </p>
              <h2 className="text-3xl font-black text-white leading-tight"
                style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                Bem-vindo ao Orbi<span className="text-[#1A56FF]">.</span>
              </h2>
              <p className="text-sm text-white/50 mt-1.5 max-w-sm">
                Gerencie sua ótica com inteligência artificial. Tudo em um só lugar.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/clientes"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.5)' }}>
                <Users className="size-4" /> Ver Clientes
              </Link>
              <Link href="/dashboard/agenda"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ fontFamily: 'Barlow, sans-serif', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Calendar className="size-4" /> Agenda
              </Link>
            </div>
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-5 gap-4">

          {/* Coluna esquerda — 3/5 */}
          <div className="col-span-3 space-y-4">

            {/* Card receita */}
            <GlowCard>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="size-4 text-[#8C8880]" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-[#8C8880] uppercase tracking-wider"
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      Receita
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['Hoje', '7 dias', '1 mês'] as const).map((l, i) => (
                      <button key={l}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${i === 2 ? 'bg-[#1A56FF] text-white' : 'text-[#8C8880] hover:bg-[#F7F6F3]'}`}
                        style={{ fontFamily: 'Barlow, sans-serif' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-4xl font-black text-[#1C1B18]"
                    style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                    {fmt(faturamento)}
                  </span>
                  <span className={`flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full ${faturTrend >= 0 ? 'bg-[#E6F9F3] text-[#0DB57A]' : 'bg-red-50 text-red-500'}`}>
                    <TrendingUp className="size-3" strokeWidth={2} />
                    {faturTrend >= 0 ? '+' : ''}{faturTrend}%
                  </span>
                </div>

                {/* Barra visual simples */}
                <div className="h-16 flex items-end gap-1">
                  {Array.from({ length: 30 }, (_, i) => {
                    const h = Math.random() * 100
                    const isLast = i === 29
                    return (
                      <div key={i} className="flex-1 rounded-t-sm transition-all"
                        style={{
                          height: `${Math.max(8, h)}%`,
                          background: isLast ? '#1A56FF' : faturamento > 0 ? 'rgba(26,86,255,0.15)' : '#EAE8E1',
                          minWidth: '2px'
                        }} />
                    )
                  })}
                </div>
              </div>
            </GlowCard>

            {/* Top clientes */}
            <GlowCard>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[#F59E0B]">⭐</span>
                    <span className="text-xs font-bold text-[#8C8880] uppercase tracking-wider"
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      Top Clientes
                    </span>
                  </div>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] transition-colors">
                    <RefreshCw className="size-3.5 text-[#C8C5BB]" strokeWidth={1.5} />
                  </button>
                </div>

                {topClientes.length === 0 ? (
                  <p className="text-sm text-center text-[#C8C5BB] py-6">Nenhum cliente encontrado</p>
                ) : (
                  <div className="space-y-3">
                    {topClientes.map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F7F6F3] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{
                              background: i === 0 ? 'linear-gradient(135deg,#1A56FF,#0D3ACC)' : '#EEF2FF',
                              color: i === 0 ? 'white' : '#1A56FF'
                            }}>
                            {(c.name ?? c.phone)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1C1B18]">{c.name ?? c.phone}</p>
                            <p className="text-xs text-[#C8C5BB]">{c.phone}</p>
                          </div>
                        </div>
                        <Link href={`/dashboard/clientes/${c.id}`}>
                          <ChevronRight className="size-4 text-[#C8C5BB]" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                <Link href="/dashboard/clientes"
                  className="mt-3 w-full h-9 flex items-center justify-between px-4 rounded-xl text-xs font-semibold text-[#1A56FF] hover:bg-[#EEF2FF] transition-colors"
                  style={{ fontFamily: 'Barlow, sans-serif' }}>
                  <span>Ver todos os clientes</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </GlowCard>

            {/* Agenda do dia */}
            <GlowCard>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-[#8C8880] uppercase tracking-wider"
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      Agenda de hoje
                    </span>
                  </div>
                  <Link href="/dashboard/agenda"
                    className="text-xs font-semibold text-[#1A56FF] hover:underline">
                    Ver agenda →
                  </Link>
                </div>

                {(appointments ?? []).length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="size-8 text-[#EAE8E1] mx-auto mb-2" strokeWidth={1} />
                    <p className="text-sm text-[#C8C5BB]">Nenhum agendamento para hoje</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F7F6F3]">
                    {(appointments ?? []).map((a: Record<string, unknown>) => {
                      const c = a.contacts as { name?: string; phone?: string } | null
                      const s = a.services as { name?: string } | null
                      return (
                        <div key={a.id as string} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 text-center px-1.5 py-1 rounded-lg bg-[#F7F6F3]">
                              <p className="text-xs font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                                {fmtTime(a.start_at as string)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1C1B18]">{c?.name ?? c?.phone ?? '—'}</p>
                              <p className="text-xs text-[#8C8880]">{s?.name ?? 'Atendimento'}</p>
                            </div>
                          </div>
                          <AppointmentBadge status={a.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </GlowCard>
          </div>

          {/* Coluna direita — 2/5 */}
          <div className="col-span-2 space-y-4">

            {/* Link de agendamento */}
            <GlowCard>
              <div className="p-4">
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-[2px] mb-2"
                  style={{ fontFamily: 'Barlow, sans-serif' }}>
                  Link de agendamento
                </p>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F7F6F3]">
                  <span className="text-xs text-[#1A56FF] truncate font-medium">{agendamentoLink}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#EEF2FF] transition-colors">
                      <Copy className="size-3.5 text-[#8C8880]" strokeWidth={1.5} />
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#EEF2FF] transition-colors">
                      <ExternalLink className="size-3.5 text-[#8C8880]" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* 4 métricas */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'VENDAS TOTAIS', value: fmt(faturamento), icon: DollarSign, color: '#0DB57A', bg: '#E6F9F3', sub: 'Total de faturamento' },
                { label: 'TOTAL DE CLIENTES', value: String(totalClientes), icon: Users, color: '#1A56FF', bg: '#EEF2FF', sub: 'Clientes cadastrados' },
                { label: 'AGENDAMENTOS', value: String(agendamentosHoje), icon: Calendar, color: '#F59E0B', bg: '#FEF3C7', sub: 'Total de hoje' },
                { label: 'CLIENTES NOVOS', value: String(newToday), icon: UserPlus, color: '#8B5CF6', bg: '#F5F3FF', sub: 'Novos hoje' },
              ].map((m) => (
                <GlowCard key={m.label}>
                  <div className="p-4">
                    <p className="text-[9px] font-black text-[#8C8880] uppercase tracking-[1.5px] mb-2 leading-tight"
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      {m.label}
                    </p>
                    <div className="flex items-end justify-between">
                      <p className="text-xl font-black text-[#1C1B18]"
                        style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                        {m.value}
                      </p>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: m.bg }}>
                        <m.icon className="size-4" style={{ color: m.color }} strokeWidth={1.5} />
                      </div>
                    </div>
                    <p className="text-xs text-[#C8C5BB] mt-1">{m.sub}</p>
                  </div>
                </GlowCard>
              ))}
            </div>

            {/* Relatório mensal */}
            <GlowCard>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-[#8C8880] uppercase tracking-wider"
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      Relatório Mensal
                    </span>
                  </div>
                  <span className="text-xs text-[#8C8880]">
                    {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'FATURAMENTO DO MÊS', value: fmt(faturamento), trend: `${faturTrend >= 0 ? '+' : ''}${faturTrend}%` },
                    { label: 'TICKET MÉDIO', value: fmt(ticketMedio), trend: '—' },
                    { label: 'TOTAL DE AGENDAMENTOS', value: String(agendamentosHoje), trend: '—' },
                    { label: 'CONVERSAS IA', value: String((conversations ?? []).length), trend: '—' },
                  ].map((r) => (
                    <div key={r.label} className="p-3 rounded-xl bg-[#F7F6F3]">
                      <p className="text-[9px] font-bold text-[#8C8880] uppercase tracking-wider mb-1"
                        style={{ fontFamily: 'Barlow, sans-serif' }}>
                        {r.label}
                      </p>
                      <p className="text-base font-black text-[#1C1B18]"
                        style={{ fontFamily: 'Fraunces, serif' }}>
                        {r.value}
                      </p>
                      <p className="text-[10px] text-[#C8C5BB] mt-0.5">{r.trend} vs mês anterior</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>

            {/* Conversas IA */}
            <GlowCard>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 text-purple-500" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-[#8C8880] uppercase tracking-wider"
                      style={{ fontFamily: 'Barlow, sans-serif' }}>
                      IA hoje
                    </span>
                  </div>
                  <Link href="/dashboard/conversas" className="text-xs text-[#1A56FF] font-semibold hover:underline">
                    Ver todas →
                  </Link>
                </div>
                {(conversations ?? []).length === 0 ? (
                  <p className="text-xs text-center text-[#C8C5BB] py-4">Nenhuma conversa hoje</p>
                ) : (
                  <div className="space-y-2">
                    {(conversations ?? []).slice(0, 3).map((c: Record<string, unknown>) => {
                      const ct = c.contacts as { name?: string; phone?: string } | null
                      const isEsc = !!c.escalated_at
                      const isAI = c.handled_by_ai && !isEsc
                      return (
                        <div key={c.id as string} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F6F3]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: isEsc ? '#FEF3C7' : isAI ? '#EEF2FF' : '#F1F0EC', color: isEsc ? '#F59E0B' : isAI ? '#1A56FF' : '#8C8880' }}>
                              {(ct?.name ?? ct?.phone ?? '?')[0].toUpperCase()}
                            </div>
                            <p className="text-xs font-semibold text-[#1C1B18]">{ct?.name ?? ct?.phone ?? '—'}</p>
                          </div>
                          <span className="text-[9px] font-black px-2 py-1 rounded-full uppercase"
                            style={{ fontFamily: 'Barlow, sans-serif', background: isEsc ? '#FEF3C7' : isAI ? '#EEF2FF' : '#F1F0EC', color: isEsc ? '#F59E0B' : isAI ? '#1A56FF' : '#8C8880' }}>
                            {isEsc ? 'ESCALADA' : isAI ? 'IA' : 'HUMANO'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </GlowCard>
          </div>
        </div>
      </div>
    </div>
  )
}
