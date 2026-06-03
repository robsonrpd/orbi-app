'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_TRANSACTION_AMOUNT = 1_000_000

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id ?? null
}

export async function createTransaction(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const contactId = formData.get('contact_id') as string
  const amountRaw = formData.get('amount') as string
  const dueDate = formData.get('due_date') as string
  const notes = formData.get('notes') as string

  if (!contactId || !amountRaw) return { error: 'Preencha os campos obrigatórios.' }

  // SEGURANÇA: valida que o contato pertence à empresa
  const { data: contact } = await service
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('company_id', companyId)
    .single()

  if (!contact) return { error: 'Cliente não encontrado.' }

  // Validação de valor no servidor
  const amount = parseFloat(amountRaw.replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido.' }
  if (amount > MAX_TRANSACTION_AMOUNT) return { error: 'Valor acima do limite permitido.' }

  // Validação de data
  if (dueDate && isNaN(new Date(dueDate).getTime())) {
    return { error: 'Data de vencimento inválida.' }
  }

  const { error } = await service.from('transactions').insert({
    company_id: companyId,
    contact_id: contactId,
    amount,
    due_date: dueDate || null,
    status: 'pending',
    notes: notes?.trim() || null,
  })

  if (error) return { error: 'Erro ao criar cobrança.' }

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}
