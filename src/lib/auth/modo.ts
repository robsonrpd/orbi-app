import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from './company'

export const VENDEDOR_COOKIE = 'orbi_vendedor'

export type ModoInfo = { funcionario: boolean; bloqueios: string[]; temPin: boolean; vendedorNome: string | null }

export async function getModo(): Promise<ModoInfo> {
  const c = await cookies()
  const vendedorId = c.get(VENDEDOR_COOKIE)?.value
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { funcionario: false, bloqueios: [], temPin: false, vendedorNome: null }

  const service = createServiceClient()
  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const temPin = !!((comp?.settings ?? {}) as { dono_pin?: string }).dono_pin

  if (!vendedorId) return { funcionario: false, bloqueios: [], temPin, vendedorNome: null }

  const { data: v } = await service.from('vendedores')
    .select('nome, bloqueios').eq('id', vendedorId).eq('company_id', companyId).single()
  if (!v) return { funcionario: false, bloqueios: [], temPin, vendedorNome: null }

  return { funcionario: true, bloqueios: (v.bloqueios as string[]) ?? [], temPin, vendedorNome: v.nome as string }
}

/** Bloqueia o acesso direto a uma página se o vendedor ativo não tiver permissão. */
export async function guardModo(bloqueio: string) {
  const m = await getModo()
  if (m.funcionario && m.bloqueios.includes(bloqueio)) redirect('/dashboard')
}
