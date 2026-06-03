'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id ?? null
}

export async function createAppointment(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const contactId = formData.get('contact_id') as string
  const serviceId = formData.get('service_id') as string
  const professional = formData.get('professional') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const notes = formData.get('notes') as string

  if (!contactId || !date || !time) return { error: 'Preencha os campos obrigatórios.' }

  // SEGURANÇA: valida que o contato pertence à empresa
  const { data: contact } = await service
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('company_id', companyId)
    .single()

  if (!contact) return { error: 'Cliente não encontrado.' }

  // SEGURANÇA: valida que o serviço pertence à empresa (se informado)
  let durationMinutes = 60
  if (serviceId) {
    const { data: svc } = await service
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .eq('company_id', companyId)
      .single()
    if (!svc) return { error: 'Serviço não encontrado.' }
    durationMinutes = svc.duration_minutes
  }

  const startAt = new Date(`${date}T${time}:00`)
  if (isNaN(startAt.getTime())) return { error: 'Data/hora inválida.' }

  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000)

  const { error } = await service.from('appointments').insert({
    company_id: companyId,
    contact_id: contactId,
    service_id: serviceId || null,
    professional: professional?.trim() || null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: 'scheduled',
    notes: notes?.trim() || null,
  })

  if (error) return { error: 'Erro ao criar agendamento.' }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  // SEGURANÇA: valida status permitido
  if (!VALID_STATUSES.includes(status)) return { error: 'Status inválido.' }

  const service = createServiceClient()

  // SEGURANÇA: só atualiza agendamentos da própria empresa
  const { error } = await service
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) return { error: 'Erro ao atualizar agendamento.' }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard')
  return { success: true }
}
