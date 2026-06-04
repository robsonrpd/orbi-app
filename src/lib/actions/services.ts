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

export async function createService(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const name = formData.get('name') as string
  const price = parseFloat((formData.get('price') as string)?.replace(',', '.') ?? '0')
  const duration = parseInt(formData.get('duration') as string ?? '60')
  const description = formData.get('description') as string

  if (!name?.trim()) return { error: 'Nome é obrigatório.' }
  if (isNaN(price) || price < 0) return { error: 'Preço inválido.' }
  if (isNaN(duration) || duration < 5) return { error: 'Duração mínima é 5 minutos.' }

  const service = createServiceClient()
  const { error } = await service.from('services').insert({
    company_id: companyId,
    name: name.trim(),
    price,
    duration_minutes: duration,
    active: true,
  })

  if (error) return { error: 'Erro ao criar serviço.' }
  revalidatePath('/dashboard/servicos')
  return { success: true }
}

export async function updateService(id: string, formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: existing } = await service.from('services').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Serviço não encontrado.' }

  const name = formData.get('name') as string
  const price = parseFloat((formData.get('price') as string)?.replace(',', '.') ?? '0')
  const duration = parseInt(formData.get('duration') as string ?? '60')

  const { error } = await service.from('services').update({
    name: name.trim(),
    price,
    duration_minutes: duration,
  }).eq('id', id).eq('company_id', companyId)

  if (error) return { error: 'Erro ao atualizar serviço.' }
  revalidatePath('/dashboard/servicos')
  return { success: true }
}

export async function deleteService(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: existing } = await service.from('services').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Serviço não encontrado.' }

  const { error } = await service.from('services').update({ active: false }).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao remover serviço.' }

  revalidatePath('/dashboard/servicos')
  return { success: true }
}

export async function saveSchedule(schedule: Record<string, { open: string; close: string; active: boolean }>, intervalMinutes: number) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('companies').update({
    settings: { schedule, interval_minutes: intervalMinutes }
  }).eq('id', companyId)

  if (error) return { error: 'Erro ao salvar horários.' }
  revalidatePath('/dashboard/funcionamento')
  return { success: true }
}
