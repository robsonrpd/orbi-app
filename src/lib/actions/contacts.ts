'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

function extractFields(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k) as string
    return v?.trim() ? v.trim() : null
  }
  const tagsRaw = formData.get('tags') as string
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const lgpd = (formData.get('lgpd_consent') as string) || 'nao_informado'
  const active = formData.get('active') !== 'false'

  return {
    name: get('name'),
    phone: get('phone'),
    email: get('email'),
    cep: get('cep'),
    endereco: get('endereco'),
    numero: get('numero'),
    complemento: get('complemento'),
    bairro: get('bairro'),
    cidade: get('cidade'),
    uf: get('uf'),
    data_nascimento: get('data_nascimento'),
    notes: get('notes'),
    tags,
    lgpd_consent: lgpd,
    active,
  }
}

export async function createContact(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const f = extractFields(formData)
  if (!f.phone) return { error: 'Telefone é obrigatório.' }
  if (f.phone.length > 20) return { error: 'Telefone inválido.' }
  if (f.name && f.name.length > 200) return { error: 'Nome muito longo.' }

  const service = createServiceClient()
  const { error } = await service.from('contacts').insert({
    company_id: companyId,
    ...f,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Este telefone já está cadastrado.' }
    return { error: 'Erro ao cadastrar cliente.' }
  }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}

export async function updateContact(id: string, formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: existing } = await service
    .from('contacts').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Contato não encontrado.' }

  const f = extractFields(formData)
  if (!f.phone) return { error: 'Telefone é obrigatório.' }

  const { error } = await service.from('contacts').update(f).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao atualizar cliente.' }

  revalidatePath('/dashboard/clientes')
  revalidatePath(`/dashboard/clientes/${id}`)
  return { success: true }
}

export async function deleteContact(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: existing } = await service
    .from('contacts').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Cliente não encontrado.' }

  const { error } = await service.from('contacts').delete().eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao excluir. O cliente pode ter vendas/agendamentos vinculados.' }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}
