'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getSuperAdmin } from '@/lib/auth/super-admin'
import { revalidatePath } from 'next/cache'

const VALID_STATUS = ['trial', 'active', 'overdue', 'cancelled']
const VALID_PLAN = ['individual', 'equipe', 'ilimitado']

export async function updateCompanyStatus(companyId: string, status: string) {
  const admin = await getSuperAdmin()
  if (!admin) return { error: 'Acesso negado.' }
  if (!VALID_STATUS.includes(status)) return { error: 'Status inválido.' }

  const service = createServiceClient()
  const { error } = await service.from('companies').update({ subscription_status: status }).eq('id', companyId)
  if (error) return { error: 'Erro ao atualizar.' }
  revalidatePath('/founder')
  return { success: true }
}

export async function updateCompanyPlan(companyId: string, plan: string) {
  const admin = await getSuperAdmin()
  if (!admin) return { error: 'Acesso negado.' }
  if (!VALID_PLAN.includes(plan)) return { error: 'Plano inválido.' }

  const service = createServiceClient()
  const { error } = await service.from('companies').update({ subscription_plan: plan }).eq('id', companyId)
  if (error) return { error: 'Erro ao atualizar.' }
  revalidatePath('/founder')
  return { success: true }
}

export async function extendTrial(companyId: string, dias: number) {
  const admin = await getSuperAdmin()
  if (!admin) return { error: 'Acesso negado.' }

  const service = createServiceClient()
  const novaData = new Date()
  novaData.setDate(novaData.getDate() + dias)
  const { error } = await service.from('companies')
    .update({ trial_ends_at: novaData.toISOString(), subscription_status: 'trial' }).eq('id', companyId)
  if (error) return { error: 'Erro ao estender trial.' }
  revalidatePath('/founder')
  return { success: true }
}
