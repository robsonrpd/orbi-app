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

export async function createContact(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const notes = formData.get('notes') as string
  const tagsRaw = formData.get('tags') as string
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  if (!phone?.trim()) return { error: 'Telefone é obrigatório.' }
  if (phone.length > 20) return { error: 'Telefone inválido.' }
  if (name && name.length > 200) return { error: 'Nome muito longo.' }

  const { error } = await service.from('contacts').insert({
    company_id: companyId, // sempre do servidor, nunca do cliente
    name: name?.trim() || null,
    phone: phone.trim(),
    notes: notes?.trim() || null,
    tags,
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

  // SEGURANÇA: confirma que o contato pertence à empresa do usuário
  const { data: existing } = await service
    .from('contacts')
    .select('id')
    .eq('id', id)
    .eq('company_id', companyId)
    .single()

  if (!existing) return { error: 'Contato não encontrado.' }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const notes = formData.get('notes') as string
  const tagsRaw = formData.get('tags') as string
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  if (!phone?.trim()) return { error: 'Telefone é obrigatório.' }

  const { error } = await service.from('contacts').update({
    name: name?.trim() || null,
    phone: phone.trim(),
    notes: notes?.trim() || null,
    tags,
  }).eq('id', id).eq('company_id', companyId)

  if (error) return { error: 'Erro ao atualizar cliente.' }

  revalidatePath('/dashboard/clientes')
  revalidatePath(`/dashboard/clientes/${id}`)
  return { success: true }
}
