'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getSuperAdmin } from '@/lib/auth/super-admin'
import { gerarSenhaTemporaria } from '@/lib/senha'
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

/**
 * O fundador gera uma SENHA TEMPORÁRIA para o dono de uma loja (esqueceu a senha) e a envia por conta
 * própria (WhatsApp). Nada é enviado por e-mail. A senha só é devolvida aqui, uma vez: não fica salva.
 * O dono troca por uma dele em Configurações, Alterar senha.
 */
export async function gerarSenhaTemporariaDono(companyId: string) {
  const admin = await getSuperAdmin()
  if (!admin) return { error: 'Acesso negado.' }

  const service = createServiceClient()
  const { data: dono } = await service.from('users')
    .select('id, email, name').eq('company_id', companyId).eq('role', 'admin')
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (!dono) return { error: 'Essa loja ainda não tem dono cadastrado (o código da loja ainda não foi usado).' }

  const senha = gerarSenhaTemporaria()
  const { error } = await service.auth.admin.updateUserById(dono.id, { password: senha })
  if (error) return { error: 'Não foi possível redefinir a senha.' }

  return { success: true, email: dono.email as string, nome: (dono.name as string | null) ?? null, senha }
}
