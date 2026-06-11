'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

export async function createVendedor(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const nome = (formData.get('nome') as string)?.trim()
  const telefone = (formData.get('telefone') as string)?.trim() || null
  const comissao = parseFloat((formData.get('comissao') as string)?.replace(',', '.') ?? '0')

  if (!nome) return { error: 'Nome é obrigatório.' }
  if (isNaN(comissao) || comissao < 0 || comissao > 100) return { error: 'Comissão inválida (0-100%).' }

  const service = createServiceClient()
  const { error } = await service.from('vendedores').insert({
    company_id: companyId, nome, telefone, comissao_percent: comissao, active: true,
  })
  if (error) return { error: 'Erro ao cadastrar vendedor.' }

  revalidatePath('/dashboard/vendedores')
  return { success: true }
}

export async function deleteVendedor(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('vendedores').update({ active: false }).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao remover.' }
  revalidatePath('/dashboard/vendedores')
  return { success: true }
}
