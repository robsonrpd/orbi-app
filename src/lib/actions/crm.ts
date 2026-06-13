'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

/* ---------- Responsável ---------- */
export async function setResponsavel(contactId: string, vendedorId: string | null) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('contacts')
    .update({ responsavel_id: vendedorId } as never).eq('id', contactId).eq('company_id', companyId)
  if (error) return { error: 'Erro ao salvar responsável.' }
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Tarefas ---------- */
export async function criarTarefa(contactId: string, titulo: string, venceEm: string | null) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!titulo.trim()) return { error: 'Descreva a tarefa.' }
  const service = createServiceClient()
  const { data, error } = await service.from('lead_tarefas').insert({
    company_id: companyId, contact_id: contactId, titulo: titulo.trim(), vence_em: venceEm || null,
  } as never).select('id, titulo, vence_em, feito, created_at').single()
  if (error) return { error: 'Erro ao criar tarefa.' }
  revalidatePath('/dashboard/funil')
  return { success: true, tarefa: data }
}

export async function toggleTarefa(id: string, feito: boolean) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('lead_tarefas').update({ feito } as never).eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

export async function excluirTarefa(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('lead_tarefas').delete().eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Anotações ---------- */
export async function criarAnotacao(contactId: string, texto: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!texto.trim()) return { error: 'Escreva a anotação.' }
  const service = createServiceClient()
  const { data, error } = await service.from('lead_anotacoes').insert({
    company_id: companyId, contact_id: contactId, texto: texto.trim(),
  } as never).select('id, texto, created_at').single()
  if (error) return { error: 'Erro ao salvar anotação.' }
  revalidatePath('/dashboard/funil')
  return { success: true, anotacao: data }
}

export async function excluirAnotacao(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('lead_anotacoes').delete().eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Mensagens prontas ---------- */
export async function criarMsgPronta(titulo: string, texto: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!titulo.trim() || !texto.trim()) return { error: 'Preencha título e texto.' }
  const service = createServiceClient()
  const { data, error } = await service.from('mensagens_prontas').insert({
    company_id: companyId, titulo: titulo.trim(), texto: texto.trim(),
  } as never).select('id, titulo, texto').single()
  if (error) return { error: 'Erro ao salvar mensagem.' }
  revalidatePath('/dashboard/funil')
  return { success: true, msg: data }
}

export async function excluirMsgPronta(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('mensagens_prontas').delete().eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}
