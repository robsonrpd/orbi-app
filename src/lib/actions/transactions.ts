'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

const MAX_TRANSACTION_AMOUNT = 1_000_000

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

const FORMAS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro']

/** Dá baixa manual numa cobrança: marca como paga com a forma de pagamento. */
export async function baixarTransacao(id: string, forma: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!FORMAS.includes(forma)) return { error: 'Forma de pagamento inválida.' }

  const service = createServiceClient()
  // Valida posse
  const { data: tx } = await service
    .from('transactions').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!tx) return { error: 'Cobrança não encontrada.' }

  const { error } = await service.from('transactions').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
    forma_pagamento: forma,
  }).eq('id', id).eq('company_id', companyId)

  if (error) return { error: 'Erro ao dar baixa.' }

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

/** Reabre uma cobrança paga (volta para pendente). */
export async function reabrirTransacao(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('transactions').update({
    status: 'pending', paid_at: null, forma_pagamento: null,
  }).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao reabrir.' }
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}
