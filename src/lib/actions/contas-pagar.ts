'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

export async function createContaPagar(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const descricao = (formData.get('descricao') as string)?.trim()
  const fornecedor = (formData.get('fornecedor') as string)?.trim() || null
  const valor = parseFloat((formData.get('valor') as string)?.replace(',', '.') ?? '0')
  const vencimento = (formData.get('vencimento') as string) || null

  if (!descricao) return { error: 'Descrição obrigatória.' }
  if (isNaN(valor) || valor <= 0) return { error: 'Valor inválido.' }

  const service = createServiceClient()
  const { error } = await service.from('contas_pagar').insert({
    company_id: companyId, descricao, fornecedor, valor, vencimento, status: 'pendente',
  })
  if (error) return { error: 'Erro ao criar conta.' }

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function pagarConta(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('contas_pagar')
    .update({ status: 'pago', pago_em: new Date().toISOString() })
    .eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao baixar conta.' }
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteContaPagar(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('contas_pagar').delete().eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao excluir.' }
  revalidatePath('/dashboard/financeiro')
  return { success: true }
}
