'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_STATUS = ['emitida', 'laboratorio', 'pronta', 'entregue', 'cancelada']

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id ?? null
}

type OSItem = { tipo: 'servico' | 'produto'; descricao: string; valor: number; qtd: number }

export async function createOS(payload: {
  contactId: string
  receitaId: string | null
  vendedor: string
  medico: string
  laboratorio: string
  dataPrevistaCliente: string | null
  dataPrevistaFornecedor: string | null
  itens: OSItem[]
  desconto: number
  sinal: number
  garantia: boolean
  garantiaNumero: string
  observacoes: string
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()

  // Valida cliente
  const { data: contact } = await service
    .from('contacts').select('id').eq('id', payload.contactId).eq('company_id', companyId).single()
  if (!contact) return { error: 'Cliente não encontrado.' }

  if (!payload.itens || payload.itens.length === 0) {
    return { error: 'Adicione ao menos um item (serviço ou produto).' }
  }

  // Calcula total
  const subtotal = payload.itens.reduce((s, i) => s + (Number(i.valor) * Number(i.qtd)), 0)
  const total = Math.max(0, subtotal - Number(payload.desconto || 0))

  // Próximo número sequencial por empresa
  const { data: last } = await service
    .from('ordens_servico').select('numero')
    .eq('company_id', companyId).order('numero', { ascending: false }).limit(1).single()
  const numero = (last?.numero ?? 0) + 1

  const { error } = await service.from('ordens_servico').insert({
    company_id: companyId,
    numero,
    contact_id: payload.contactId,
    receita_id: payload.receitaId || null,
    vendedor: payload.vendedor?.trim() || null,
    medico: payload.medico?.trim() || null,
    laboratorio: payload.laboratorio?.trim() || null,
    status: 'emitida',
    data_prevista_cliente: payload.dataPrevistaCliente || null,
    data_prevista_fornecedor: payload.dataPrevistaFornecedor || null,
    itens: payload.itens,
    desconto: payload.desconto || 0,
    total,
    sinal: payload.sinal || 0,
    garantia: payload.garantia,
    garantia_numero: payload.garantiaNumero?.trim() || null,
    observacoes: payload.observacoes?.trim() || null,
  })

  if (error) return { error: 'Erro ao criar ordem de serviço.' }

  revalidatePath('/dashboard/ordens-servico')
  revalidatePath('/dashboard')
  return { success: true, numero }
}

export async function updateOSStatus(id: string, status: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!VALID_STATUS.includes(status)) return { error: 'Status inválido.' }

  const service = createServiceClient()
  const { error } = await service
    .from('ordens_servico').update({ status }).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath('/dashboard/ordens-servico')
  return { success: true }
}

export async function deleteOS(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service
    .from('ordens_servico').delete().eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao excluir.' }

  revalidatePath('/dashboard/ordens-servico')
  return { success: true }
}
