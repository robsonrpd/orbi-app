'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

const VALID_STATUS = ['planejamento', 'andamento', 'revisao', 'concluido']

export async function createProjeto(payload: {
  nome: string; contactId: string | null; responsavel: string; valor: number; prazo: string | null; notas: string
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!payload.nome.trim()) return { error: 'Dê um nome ao projeto.' }

  const service = createServiceClient()
  const { error } = await service.from('projetos' as never).insert({
    company_id: companyId,
    nome: payload.nome.trim(),
    contact_id: payload.contactId || null,
    responsavel: payload.responsavel?.trim() || null,
    valor: payload.valor || 0,
    prazo: payload.prazo || null,
    status: 'planejamento',
    notas: payload.notas?.trim() || null,
  } as never)
  if (error) return { error: 'Erro ao criar projeto.' }

  revalidatePath('/dashboard/projetos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateProjetoStatus(id: string, status: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!VALID_STATUS.includes(status)) return { error: 'Status inválido.' }

  const service = createServiceClient()
  const { error } = await service.from('projetos' as never)
    .update({ status } as never).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath('/dashboard/projetos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateProjeto(id: string, payload: {
  nome: string; contactId: string | null; responsavel: string; valor: number; prazo: string | null; notas: string
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!payload.nome.trim()) return { error: 'Dê um nome ao projeto.' }

  const service = createServiceClient()
  const { error } = await service.from('projetos' as never).update({
    nome: payload.nome.trim(),
    contact_id: payload.contactId || null,
    responsavel: payload.responsavel?.trim() || null,
    valor: payload.valor || 0,
    prazo: payload.prazo || null,
    notas: payload.notas?.trim() || null,
  } as never).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao salvar projeto.' }

  revalidatePath('/dashboard/projetos')
  return { success: true }
}

export async function deleteProjeto(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('projetos' as never).delete().eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao excluir.' }

  revalidatePath('/dashboard/projetos')
  revalidatePath('/dashboard')
  return { success: true }
}
