import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { GlowCard } from '@/components/orbi/glow-card'
import { EvolucaoVendasChart, EstoqueDonut, OSFunnelChart } from '@/components/orbi/dashboard-charts'
import {
  ArrowUpCircle, ArrowDownCircle, Gift, PackageCheck, Eye,
  TrendingUp, Glasses, FileText, ChevronRight, Cake,
  Users, ShoppingBag, DollarSign
} from 'lucide-react'
import Link from 'next/link'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()
  const { data: userRow } = await service.from('users').select('name').eq('id', user!.id).single()
  const { data: companyRow } = await service.from('companies').select('name').eq('id', companyId).single()
  const companyName = companyRow?.name ?? 'Minha Ótica'
  const firstName = userRow?.name?.split(' ')[0] ?? 'usuário'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const now = new Date()
  const mesAtual = now.getMonth() + 1
  const umAnoAtras = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString()

  // Busca paralela de tudo
  const [
    { data: transactions }, { data: contasPagar }, { data: contacts },
    { data: ordens }, { data: receitas }, { data: products },
  ] = await Promise.all([
    service.from('transactions').select('amount, status, created_at, paid_at, forma_pagamento, contact_id').eq('company_id', companyId),
    service.from('contas_pagar' as never).select('valor, status').eq('company_id', companyId),
    service.from('contacts').select('id, name, phone, data_nascimento').eq('company_id', companyId),
    service.from('ordens_servico').select('status, total, created_at').eq('company_id', companyId),
    service.from('receitas').select('id, data_receita, contact_id, contacts(name, phone)').eq('company_id', companyId).lt('data_receita', umAnoAtras.split('T')[0]),
    service.from('products' as never).select('tipo_produto, stock').eq('company_id', companyId).eq('active', true),
  ])

  // KPI 1 — Contas a receber
  const aReceber = (transactions ?? []).filter(t => t.status === 'pending' || t.status === 'overdue').reduce((s, t) => s + Number(t.amount), 0)
  // KPI 2 — Contas a pagar
  const aPagar = ((contasPagar ?? []) as { valor: number; status: string }[]).filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0)
  // KPI 3 — Aniversariantes do mês
  const aniversariantes = (contacts ?? []).filter(c => {
    if (!c.data_nascimento) return false
    return new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1 === mesAtual
  })
  // KPI 4 — Entregas pendentes (O.S. não entregue/cancelada)
  const entregasPendentes = (ordens ?? []).filter(o => o.status !== 'entregue' && o.status !== 'cancelada').length
  // KPI 5 — Receitas vencidas
  const receitasVencidas = receitas ?? []

  // Faturamento do mês + comparação com mês anterior
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  type Tx = { amount: number; status: string; created_at: string; paid_at: string | null; forma_pagamento: string | null; contact_id: string | null }
  const txList = (transactions ?? []) as Tx[]
  const dataRef = (t: Tx) => (t.paid_at ?? t.created_at)

  const pagasMes = txList.filter(t => t.status === 'paid' && dataRef(t) >= monthStart)
  const pagasMesAnterior = txList.filter(t => t.status === 'paid' && dataRef(t) >= lastMonthStart && dataRef(t) < monthStart)
  const faturamento = pagasMes.reduce((s, t) => s + Number(t.amount), 0)
  const faturamentoAnterior = pagasMesAnterior.reduce((s, t) => s + Number(t.amount), 0)
  const trendFatur = faturamentoAnterior > 0 ? Math.round(((faturamento - faturamentoAnterior) / faturamentoAnterior) * 100) : (faturamento > 0 ? 100 : 0)

  // Ticket médio + nº vendas + média de clientes/dia (mês atual)
  const numVendasMes = pagasMes.length
  const ticketMedio = numVendasMes > 0 ? faturamento / numVendasMes : 0
  const diaDoMes = now.getDate()
  const clientesUnicosMes = new Set(pagasMes.map(t => t.contact_id).filter(Boolean)).size
  const mediaClientesDia = diaDoMes > 0 ? (clientesUnicosMes / diaDoMes) : 0

  // Receita por forma de pagamento (mês atual)
  const formaLabel: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Crédito', cartao_debito: 'Débito', boleto: 'Boleto', outro: 'Outro' }
  const formaCor: Record<string, string> = { dinheiro: '#0DB57A', pix: '#1A56FF', cartao_credito: '#8B5CF6', cartao_debito: '#06B6D4', boleto: '#F59E0B', outro: '#8C8880' }
  const porForma = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro'].map(f => ({
    forma: f, label: formaLabel[f], cor: formaCor[f],
    valor: pagasMes.filter(t => t.forma_pagamento === f).reduce((s, t) => s + Number(t.amount), 0),
  })).filter(x => x.valor > 0)

  // Gráfico: evolução de faturamento (6 meses, atual vs ano anterior simulado)
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const evolucao = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const ds = d.toISOString()
    const de = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 1).toISOString()
    const atual = (transactions ?? []).filter(t => t.status === 'paid' && (t.paid_at ?? t.created_at) >= ds && (t.paid_at ?? t.created_at) < de).reduce((s, t) => s + Number(t.amount), 0)
    return { mes: meses[d.getMonth()], atual, anterior: 0 }
  })

  // Gráfico: estoque por tipo
  const prods = (products ?? []) as { tipo_produto: string | null; stock: number }[]
  const stockArmacoes = prods.filter(p => (p.tipo_produto ?? '').toLowerCase().includes('arma')).reduce((s, p) => s + (p.stock ?? 0), 0)
  const stockLentes = prods.filter(p => (p.tipo_produto ?? '').toLowerCase().includes('lente')).reduce((s, p) => s + (p.stock ?? 0), 0)
  const stockOutros = prods.filter(p => { const t = (p.tipo_produto ?? '').toLowerCase(); return !t.includes('arma') && !t.includes('lente') }).reduce((s, p) => s + (p.stock ?? 0), 0)
  const estoqueData = [
    { name: 'Armações', value: stockArmacoes, color: '#1A56FF' },
    { name: 'Lentes', value: stockLentes, color: '#8B5CF6' },
    { name: 'Outros', value: stockOutros, color: '#F59E0B' },
  ]

  // Gráfico: O.S. por status
  const osData = [
    { name: 'Emitida', value: (ordens ?? []).filter(o => o.status === 'emitida').length, color: '#1A56FF' },
    { name: 'No Lab', value: (ordens ?? []).filter(o => o.status === 'laboratorio').length, color: '#F59E0B' },
    { name: 'Pronta', value: (ordens ?? []).filter(o => o.status === 'pronta').length, color: '#8B5CF6' },
    { name: 'Entregue', value: (ordens ?? []).filter(o => o.status === 'entregue').length, color: '#0DB57A' },
  ]

  const kpis = [
    { label: 'Contas a Receber', value: fmt(aReceber), icon: ArrowUpCircle, color: '#0DB57A', bg: 'linear-gradient(135deg,#0DB57A,#0a9e6a)', href: '/dashboard/financeiro' },
    { label: 'Contas a Pagar', value: fmt(aPagar), icon: ArrowDownCircle, color: '#EF4444', bg: 'linear-gradient(135deg,#EF4444,#DC2626)', href: '/dashboard/financeiro' },
    { label: 'Aniversariantes', value: String(aniversariantes.length), icon: Gift, color: '#F59E0B', bg: 'linear-gradient(135deg,#F59E0B,#D97706)', href: '/dashboard/clientes' },
    { label: 'Entregas Pendentes', value: String(entregasPendentes), icon: PackageCheck, color: '#1A56FF', bg: 'linear-gradient(135deg,#1A56FF,#1445DD)', href: '/dashboard/ordens-servico' },
    { label: 'Receitas Vencidas', value: String(receitasVencidas.length), icon: Eye, color: '#8B5CF6', bg: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', href: '/dashboard/receitas' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Dashboard" subtitle={`${greeting}, ${firstName}! — ${companyName}`} />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* 5 KPIs coloridos */}
        <div className="grid grid-cols-5 gap-4">
          {kpis.map(k => (
            <Link key={k.label} href={k.href}
              className="rounded-2xl p-4 text-white relative overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: k.bg, boxShadow: `0 4px 20px ${k.color}40` }}>
              <div className="absolute -right-4 -top-4 opacity-20">
                <k.icon className="size-20" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <k.icon className="size-5" strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-black leading-none" style={{ fontFamily: 'Fraunces, serif' }}>{k.value}</p>
                <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wide mt-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>{k.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Relatório do Mês — visão geral de faturamento */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Faturamento do Mês', value: fmt(faturamento), trend: trendFatur, icon: TrendingUp, color: '#0DB57A', bg: '#E6F9F3' },
            { label: 'Ticket Médio', value: fmt(ticketMedio), sub: `${numVendasMes} venda${numVendasMes !== 1 ? 's' : ''} no mês`, icon: DollarSign, color: '#1A56FF', bg: '#EEF2FF' },
            { label: 'Média Clientes/Dia', value: mediaClientesDia.toFixed(1), sub: `${clientesUnicosMes} clientes no mês`, icon: Users, color: '#F59E0B', bg: '#FEF3C7' },
            { label: 'Vendas no Mês', value: String(numVendasMes), sub: 'Pagamentos recebidos', icon: ShoppingBag, color: '#8B5CF6', bg: '#F5F3FF' },
          ].map(m => (
            <GlowCard key={m.label}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: m.bg }}>
                    <m.icon className="size-4.5" style={{ color: m.color }} strokeWidth={1.5} />
                  </div>
                  {'trend' in m && m.trend !== undefined && (
                    <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${m.trend >= 0 ? 'bg-[#E6F9F3] text-[#0DB57A]' : 'bg-red-50 text-red-500'}`}>
                      {m.trend >= 0 ? '↑' : '↓'} {Math.abs(m.trend)}%
                    </span>
                  )}
                </div>
                <p className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{m.value}</p>
                <p className="text-[11px] text-[#8C8880] mt-0.5">{m.label}</p>
                {'sub' in m && m.sub && <p className="text-[10px] text-[#C8C5BB] mt-0.5">{m.sub}</p>}
                {'trend' in m && <p className="text-[10px] text-[#C8C5BB] mt-0.5">vs mês anterior</p>}
              </div>
            </GlowCard>
          ))}
        </div>

        {/* Receita por forma de pagamento (mês atual) */}
        {porForma.length > 0 && (
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                  <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Receita por Forma de Pagamento</h2>
                </div>
                <span className="text-xs text-[#8C8880]">Este mês · {fmt(faturamento)}</span>
              </div>
              {/* Barra proporcional */}
              <div className="flex h-3 rounded-full overflow-hidden mb-3">
                {porForma.map(f => (
                  <div key={f.forma} style={{ width: `${(f.valor / faturamento) * 100}%`, background: f.cor }} title={f.label} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {porForma.map(f => (
                  <div key={f.forma} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.cor }} />
                    <div>
                      <p className="text-xs text-[#8C8880]">{f.label}</p>
                      <p className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(f.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        )}

        {/* Linha de gráficos */}
        <div className="grid grid-cols-3 gap-4">
          {/* Evolução de vendas */}
          <GlowCard className="col-span-2">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                  <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Evolução de Faturamento</h2>
                </div>
                <span className="text-xs text-[#8C8880]">Últimos 6 meses</span>
              </div>
              <EvolucaoVendasChart data={evolucao} />
            </div>
          </GlowCard>

          {/* Estoque donut */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Glasses className="size-4 text-[#8B5CF6]" strokeWidth={1.5} />
                <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Estoque por Tipo</h2>
              </div>
              <EstoqueDonut data={estoqueData} />
              <div className="flex items-center justify-center gap-4 mt-2">
                {estoqueData.map(d => (
                  <span key={d.name} className="flex items-center gap-1 text-[10px] text-[#8C8880]">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name}
                  </span>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Segunda linha */}
        <div className="grid grid-cols-3 gap-4">
          {/* Funil de produção */}
          <GlowCard className="col-span-2">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                  <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Ordens de Serviço por Status</h2>
                </div>
                <Link href="/dashboard/ordens-servico" className="text-xs text-[#1A56FF] font-semibold hover:underline flex items-center gap-1">
                  Monitor de Produção <ChevronRight className="size-3" />
                </Link>
              </div>
              <OSFunnelChart data={osData} />
            </div>
          </GlowCard>

          {/* Aniversariantes do mês */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cake className="size-4 text-[#F59E0B]" strokeWidth={1.5} />
                <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Aniversariantes do Mês</h2>
              </div>
              {aniversariantes.length === 0 ? (
                <p className="text-sm text-[#C8C5BB] text-center py-8">Nenhum aniversariante este mês</p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {aniversariantes.slice(0, 6).map(c => {
                    const dia = new Date(c.data_nascimento! + 'T12:00:00').getDate()
                    return (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-[#FEF3C7]/40">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center text-xs font-bold text-[#F59E0B]">
                            {(c.name ?? c.phone)[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#1C1B18]">{c.name ?? c.phone}</span>
                        </div>
                        <span className="text-xs font-bold text-[#F59E0B]">Dia {dia}</span>
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
  )
}
