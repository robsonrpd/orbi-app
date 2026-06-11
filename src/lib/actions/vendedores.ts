'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

function extract(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k) as string
    return v?.trim() ? v.trim() : null
  }
  const bloqueiosRaw = (formData.get('bloqueios') as string) || ''
  const bloqueios = bloqueiosRaw ? bloqueiosRaw.split(',').map(b => b.trim()).filter(Boolean) : []
  return {
    nome: get('nome'),
    telefone: get('telefone'),
    email: get('email'),
    data_nascimento: get('data_nascimento'),
    cep: get('cep'),
    endereco: get('endereco'),
    numero: get('numero'),
    complemento: get('complemento'),
    bairro: get('bairro'),
    cidade: get('cidade'),
    uf: get('uf'),
    notes: get('notes'),
    bloqueios,
  }
}

export async function createVendedor(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const f = extract(formData)
  if (!f.nome) return { error: 'Nome é obrigatório.' }

  const service = createServiceClient()
  const { error } = await service.from('vendedores').insert({
    company_id: companyId, ...f, active: true,
  } as never)
  if (error) return { error: 'Erro ao cadastrar vendedor.' }

  revalidatePath('/dashboard/vendedores')
  return { success: true }
}

export async function updateVendedor(id: string, formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: existing } = await service.from('vendedores').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Vendedor não encontrado.' }

  const f = extract(formData)
  if (!f.nome) return { error: 'Nome é obrigatório.' }

  const { error } = await service.from('vendedores').update(f as never).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao atualizar vendedor.' }

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
