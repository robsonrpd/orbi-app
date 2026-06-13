'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { FUNIL_KEYS } from '@/lib/funil'
import { revalidatePath } from 'next/cache'

/** Move um lead para outra etapa do funil. */
export async function moverLead(contactId: string, etapa: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!FUNIL_KEYS.includes(etapa)) return { error: 'Etapa inválida.' }

  const service = createServiceClient()
  const { error } = await service.from('contacts')
    .update({ funil_etapa: etapa }).eq('id', contactId).eq('company_id', companyId)
  if (error) return { error: 'Erro ao mover o lead.' }
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/** Cria um lead manual (entra na coluna "Novo Lead"). */
export async function criarLead(nome: string, telefone: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!telefone?.trim()) return { error: 'Telefone é obrigatório.' }

  const service = createServiceClient()
  const { error } = await service.from('contacts').insert({
    company_id: companyId,
    name: nome?.trim() || null,
    phone: telefone.trim(),
    origem: 'Manual',
    funil_etapa: 'novo',
    active: true,
  } as never)
  if (error) return { error: 'Erro ao criar lead.' }
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/** Atualiza o valor estimado de um lead. */
export async function atualizarValorLead(contactId: string, valor: number) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('contacts')
    .update({ funil_valor: isNaN(valor) ? 0 : valor } as never)
    .eq('id', contactId).eq('company_id', companyId)
  if (error) return { error: 'Erro ao salvar o valor.' }
  revalidatePath('/dashboard/funil')
  return { success: true }
}
