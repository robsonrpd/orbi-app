'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { MODO_COOKIE } from '@/lib/auth/modo'
import { revalidatePath } from 'next/cache'

/** Entra em Modo Funcionário (esconde áreas configuradas). */
export async function entrarModoFuncionario() {
  const c = await cookies()
  c.set(MODO_COOKIE, 'funcionario', {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 12, // 12h
  })
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Sai do Modo Funcionário (volta a ver tudo). Exige o PIN se houver. */
export async function sairModoFuncionario(pin: string) {
  const companyId = await getEffectiveCompanyId()
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const realPin = ((data?.settings ?? {}) as { funcionario?: { pin?: string } }).funcionario?.pin
  if (realPin && (pin ?? '').trim() !== realPin) return { error: 'PIN incorreto.' }

  const c = await cookies()
  c.delete(MODO_COOKIE)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Salva a configuração do Modo Funcionário (bloqueios + PIN). Só o dono usa. */
export async function salvarConfigFuncionario(bloqueios: string[], pin: string) {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  settings.funcionario = { bloqueios, pin: (pin ?? '').trim() || undefined }

  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar configuração.' }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
