'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

export type DashboardItemState = { key: string; label: string; visivel: boolean }
type Salvo = { key: string; visivel: boolean }

function kpisDefault(isGeral: boolean): DashboardItemState[] {
  return [
    { key: 'contas_receber', label: 'Contas a Receber', visivel: true },
    { key: 'contas_pagar', label: 'Contas a Pagar', visivel: true },
    { key: 'aniversariantes', label: 'Aniversariantes', visivel: true },
    { key: 'kpi_producao', label: isGeral ? 'Projetos em Andamento' : 'Entregas Pendentes', visivel: true },
    { key: 'kpi_qualidade', label: isGeral ? 'Ticket Médio' : 'Receitas Vencidas', visivel: true },
  ]
}

function resumoDefault(): DashboardItemState[] {
  return [
    { key: 'vendas_totais', label: 'Vendas Totais', visivel: true },
    { key: 'total_clientes', label: 'Total de Clientes', visivel: true },
    { key: 'agendamentos', label: 'Agendamentos', visivel: true },
    { key: 'clientes_novos', label: 'Clientes Novos', visivel: true },
  ]
}

function secoesDefault(isGeral: boolean): DashboardItemState[] {
  const base: DashboardItemState[] = [
    { key: 'relatorio_mensal', label: 'Relatório Mensal', visivel: true },
    { key: 'top_clientes', label: 'Top Clientes', visivel: true },
    { key: 'forma_pagamento', label: 'Receita por Forma de Pagamento', visivel: true },
    { key: 'evolucao_faturamento', label: 'Evolução de Faturamento', visivel: true },
    { key: 'secundario', label: isGeral ? 'Receita x Despesa' : 'Estoque por Tipo', visivel: true },
    { key: 'funil_status', label: isGeral ? 'Projetos por Status' : 'Ordens de Serviço por Status', visivel: true },
    { key: 'aniversariantes_mes', label: 'Aniversariantes do Mês', visivel: true },
  ]
  if (isGeral) base.push({ key: 'ticket_medio_cliente', label: 'Ticket Médio por Cliente', visivel: true })
  return base
}

// aplica a ordem/visibilidade salva por cima da lista padrão (rótulos sempre vêm do padrão atual,
// pra não ficar com nome desatualizado se o nicho mudou). Chaves salvas que não existem mais são
// descartadas; chaves novas do padrão que o usuário nunca viu entram visíveis no fim da lista.
function aplicarSalvo(padrao: DashboardItemState[], salvo: Salvo[] | undefined): DashboardItemState[] {
  if (!salvo || salvo.length === 0) return padrao
  const padraoPorKey = new Map(padrao.map(i => [i.key, i]))
  const usadas = new Set<string>()
  const ordenado: DashboardItemState[] = []
  for (const s of salvo) {
    const p = padraoPorKey.get(s.key)
    if (!p || usadas.has(s.key)) continue
    usadas.add(s.key)
    ordenado.push({ ...p, visivel: s.visivel })
  }
  for (const p of padrao) if (!usadas.has(p.key)) ordenado.push(p)
  return ordenado
}

/** Personalização do dashboard da empresa (ordem + visibilidade), com fallback pro padrão do Orbi. */
export async function obterPersonalizacaoDashboard(isGeral: boolean): Promise<{
  kpis: DashboardItemState[]; resumo: DashboardItemState[]; secoes: DashboardItemState[]
}> {
  const companyId = await getCompanyId()
  const padraoKpis = kpisDefault(isGeral)
  const padraoResumo = resumoDefault()
  const padraoSecoes = secoesDefault(isGeral)
  if (!companyId) return { kpis: padraoKpis, resumo: padraoResumo, secoes: padraoSecoes }

  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (data?.settings as {
    dashboard_kpis?: Salvo[]; dashboard_resumo?: Salvo[]; dashboard_secoes?: Salvo[]
  } | null) ?? null

  return {
    kpis: aplicarSalvo(padraoKpis, settings?.dashboard_kpis),
    resumo: aplicarSalvo(padraoResumo, settings?.dashboard_resumo),
    secoes: aplicarSalvo(padraoSecoes, settings?.dashboard_secoes),
  }
}

/** Salva a personalização (ordem + visibilidade) do dashboard. */
export async function salvarPersonalizacaoDashboard(p: { kpis: Salvo[]; resumo: Salvo[]; secoes: Salvo[] }) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const limpa = (arr: Salvo[]) => arr.filter(i => i.key?.trim()).map(i => ({ key: i.key.trim(), visivel: !!i.visivel }))

  const service = createServiceClient()
  const { data: atual } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = {
    ...(atual?.settings as Record<string, unknown> ?? {}),
    dashboard_kpis: limpa(p.kpis),
    dashboard_resumo: limpa(p.resumo),
    dashboard_secoes: limpa(p.secoes),
  }
  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar a personalização.' }

  revalidatePath('/dashboard')
  return { success: true as const }
}

/** Volta o dashboard pro padrão do Orbi. */
export async function restaurarDashboardPadrao(isGeral: boolean) {
  return salvarPersonalizacaoDashboard({
    kpis: kpisDefault(isGeral).map(i => ({ key: i.key, visivel: i.visivel })),
    resumo: resumoDefault().map(i => ({ key: i.key, visivel: i.visivel })),
    secoes: secoesDefault(isGeral).map(i => ({ key: i.key, visivel: i.visivel })),
  })
}
