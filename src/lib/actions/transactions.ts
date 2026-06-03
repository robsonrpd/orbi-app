'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return { error: 'Empresa não encontrada.' }

  const contactId = formData.get('contact_id') as string
  const amountRaw = formData.get('amount') as string
  const dueDate = formData.get('due_date') as string
  const notes = formData.get('notes') as string

  if (!contactId || !amountRaw) return { error: 'Preencha os campos obrigatórios.' }

  const amount = parseFloat(amountRaw.replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido.' }

  const { error } = await service.from('transactions').insert({
    company_id: userData.company_id,
    contact_id: contactId,
    amount,
    due_date: dueDate || null,
    status: 'pending',
    notes: notes || null,
  })

  if (error) return { error: 'Erro ao criar cobrança.' }

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}
