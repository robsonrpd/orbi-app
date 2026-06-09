'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id ?? null
}

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
