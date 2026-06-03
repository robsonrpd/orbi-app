'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createContact(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return { error: 'Empresa não encontrada.' }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const notes = formData.get('notes') as string
  const tagsRaw = formData.get('tags') as string
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  if (!phone) return { error: 'Telefone é obrigatório.' }

  const { error } = await service.from('contacts').insert({
    company_id: userData.company_id,
    name: name || null,
    phone,
    notes: notes || null,
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const notes = formData.get('notes') as string
  const tagsRaw = formData.get('tags') as string
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  const { error } = await service.from('contacts').update({
    name: name || null,
    phone,
    notes: notes || null,
    tags,
  }).eq('id', id)

  if (error) return { error: 'Erro ao atualizar cliente.' }

  revalidatePath('/dashboard/clientes')
  revalidatePath(`/dashboard/clientes/${id}`)
  return { success: true }
}
