import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from './company'

export const MODO_COOKIE = 'orbi_modo'

/** Áreas que o dono pode bloquear no Modo Funcionário. */
export const BLOQUEIOS = [
  { key: 'faturamento', label: 'Ver faturamento e valores (Dashboard)' },
  { key: 'financeiro', label: 'Acessar o Financeiro' },
  { key: 'caixa', label: 'Acessar o Caixa' },
  { key: 'relatorios', label: 'Acessar Relatórios' },
  { key: 'vendedores', label: 'Acessar Vendedores' },
  { key: 'precos', label: 'Alterar preços de produtos' },
] as const

export type ModoInfo = { funcionario: boolean; bloqueios: string[]; temPin: boolean }

export async function getModo(): Promise<ModoInfo> {
  const c = await cookies()
  const funcionario = c.get(MODO_COOKIE)?.value === 'funcionario'

  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { funcionario, bloqueios: [], temPin: false }

  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const cfg = ((data?.settings ?? {}) as { funcionario?: { bloqueios?: string[]; pin?: string } }).funcionario ?? {}
  return {
    funcionario,
    bloqueios: funcionario ? (cfg.bloqueios ?? []) : [],
    temPin: !!cfg.pin,
  }
}

/** Bloqueia o acesso direto a uma página se o Modo Funcionário estiver com aquele bloqueio. */
export async function guardModo(bloqueio: string) {
  const m = await getModo()
  if (m.funcionario && m.bloqueios.includes(bloqueio)) redirect('/dashboard')
}

/** Lê os bloqueios configurados (independente do modo atual) — para a tela de config. */
export async function getConfigFuncionario(): Promise<{ bloqueios: string[]; temPin: boolean }> {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { bloqueios: [], temPin: false }
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const cfg = ((data?.settings ?? {}) as { funcionario?: { bloqueios?: string[]; pin?: string } }).funcionario ?? {}
  return { bloqueios: cfg.bloqueios ?? [], temPin: !!cfg.pin }
}
