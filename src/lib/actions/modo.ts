'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { VENDEDOR_COOKIE } from '@/lib/auth/modo'
import { revalidatePath } from 'next/cache'

/** Passa a operar como um vendedor (aplica as permissões dele). */
export async function operarComoVendedor(vendedorId: string) {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  // valida que o vendedor é da empresa
  const service = createServiceClient()
  const { data: v } = await service.from('vendedores').select('id').eq('id', vendedorId).eq('company_id', companyId).single()
  if (!v) return { error: 'Vendedor não encontrado.' }

  const c = await cookies()
  c.set(VENDEDOR_COOKIE, vendedorId, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 12, // 12h
  })
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Volta para a visão de dono (libera tudo). Exige o PIN do dono, se houver. */
export async function sairComoVendedor(pin: string) {
  const companyId = await getEffectiveCompanyId()
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const realPin = ((data?.settings ?? {}) as { dono_pin?: string }).dono_pin
  if (realPin && (pin ?? '').trim() !== realPin) return { error: 'PIN incorreto.' }

  const c = await cookies()
  c.delete(VENDEDOR_COOKIE)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Define o PIN do dono (usado para voltar da visão de vendedor). */
export async function salvarPinDono(pin: string) {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  settings.dono_pin = (pin ?? '').trim() || undefined

  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar PIN.' }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
