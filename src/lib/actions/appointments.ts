'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAppointment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return { error: 'Empresa não encontrada.' }

  const contactId = formData.get('contact_id') as string
  const serviceId = formData.get('service_id') as string
  const professional = formData.get('professional') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const notes = formData.get('notes') as string

  if (!contactId || !date || !time) return { error: 'Preencha os campos obrigatórios.' }

  // Busca duração do serviço
  let durationMinutes = 60
  if (serviceId) {
    const { data: svc } = await service.from('services').select('duration_minutes').eq('id', serviceId).single()
    if (svc) durationMinutes = svc.duration_minutes
  }

  const startAt = new Date(`${date}T${time}:00`)
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000)

  const { error } = await service.from('appointments').insert({
    company_id: userData.company_id,
    contact_id: contactId,
    service_id: serviceId || null,
    professional: professional || null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: 'scheduled',
    notes: notes || null,
  })

  if (error) return { error: 'Erro ao criar agendamento.' }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('appointments').update({ status }).eq('id', id)
  if (error) return { error: 'Erro ao atualizar agendamento.' }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard')
  return { success: true }
}
