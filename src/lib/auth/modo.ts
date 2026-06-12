import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from './company'

export const VENDEDOR_COOKIE = 'orbi_vendedor'

// fonte: 'login' = vendedor com login próprio | 'cookie' = dono operando como vendedor
export type ModoInfo = {
  funcionario: boolean; bloqueios: string[]; temPin: boolean
  vendedorNome: string | null; fonte: 'login' | 'cookie' | null
}

export async function getModo(): Promise<ModoInfo> {
  const vazio: ModoInfo = { funcionario: false, bloqueios: [], temPin: false, vendedorNome: null, fonte: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const companyId = await getEffectiveCompanyId()
  if (!user || !companyId) return vazio

  const service = createServiceClient()
  const { data: u } = await service.from('users').select('role, vendedor_id').eq('id', user.id).single()

  // 1) Vendedor com LOGIN PRÓPRIO — permissões aplicadas automaticamente, sem PIN
  if (u?.role === 'staff' && u.vendedor_id) {
    const { data: v } = await service.from('vendedores').select('nome, bloqueios').eq('id', u.vendedor_id).single()
    // vendedor nunca gerencia a equipe
    const bloqueios = Array.from(new Set([...((v?.bloqueios as string[]) ?? []), 'vendedores']))
    return { funcionario: true, bloqueios, temPin: false, vendedorNome: (v?.nome as string) ?? 'Vendedor', fonte: 'login' }
  }

  // 2) DONO — pode estar "operando como vendedor" (cookie) com saída por PIN
  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const temPin = !!((comp?.settings ?? {}) as { dono_pin?: string }).dono_pin

  const c = await cookies()
  const vendedorId = c.get(VENDEDOR_COOKIE)?.value
  if (!vendedorId) return { ...vazio, temPin }

  const { data: v } = await service.from('vendedores')
    .select('nome, bloqueios').eq('id', vendedorId).eq('company_id', companyId).single()
  if (!v) return { ...vazio, temPin }

  return { funcionario: true, bloqueios: (v.bloqueios as string[]) ?? [], temPin, vendedorNome: v.nome as string, fonte: 'cookie' }
}

/** Bloqueia o acesso direto a uma página se o vendedor ativo não tiver permissão. */
export async function guardModo(bloqueio: string) {
  const m = await getModo()
  if (m.funcionario && m.bloqueios.includes(bloqueio)) redirect('/dashboard')
}
