'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

const VALID_STATUS = ['aberto', 'aprovado', 'recusado', 'expirado', 'convertido']

type Item = { tipo: 'servico' | 'produto'; descricao: string; valor: number; qtd: number }

export async function createOrcamento(payload: {
  contactId: string | null
  clienteNome: string
  clienteTelefone: string
  vendedor: string
  itens: Item[]
  desconto: number
  validade: string | null
  observacoes: string
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  if (!payload.clienteNome?.trim() && !payload.contactId) return { error: 'Informe o cliente.' }
  if (!payload.itens || payload.itens.length === 0) return { error: 'Adicione ao menos um item.' }

  const subtotal = payload.itens.reduce((s, i) => s + (Number(i.valor) * Number(i.qtd)), 0)
  const total = Math.max(0, subtotal - Number(payload.desconto || 0))

  const service = createServiceClient()
  const { data: last } = await service
    .from('orcamentos').select('numero').eq('company_id', companyId)
    .order('numero', { ascending: false }).limit(1).single()
  const numero = (last?.numero ?? 0) + 1

  const { error } = await service.from('orcamentos').insert({
    company_id: companyId, numero,
    contact_id: payload.contactId,
    cliente_nome: payload.clienteNome?.trim() || null,
    cliente_telefone: payload.clienteTelefone?.trim() || null,
    vendedor: payload.vendedor?.trim() || null,
    itens: payload.itens, desconto: payload.desconto || 0, total,
    validade: payload.validade || null, status: 'aberto',
    observacoes: payload.observacoes?.trim() || null,
  })
  if (error) return { error: 'Erro ao criar orçamento.' }

  revalidatePath('/dashboard/orcamentos')
  return { success: true, numero }
}

export async function updateOrcamentoStatus(id: string, status: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!VALID_STATUS.includes(status)) return { error: 'Status inválido.' }

  const service = createServiceClient()
  const { error } = await service.from('orcamentos').update({ status }).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao atualizar.' }
  revalidatePath('/dashboard/orcamentos')
  return { success: true }
}

export async function converterEmOS(orcamentoId: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: orc } = await service
    .from('orcamentos').select('*').eq('id', orcamentoId).eq('company_id', companyId).single()
  if (!orc) return { error: 'Orçamento não encontrado.' }
  if (!orc.contact_id) return { error: 'Vincule um cliente cadastrado antes de converter.' }

  // Próximo número de O.S.
  const { data: lastOS } = await service
    .from('ordens_servico').select('numero').eq('company_id', companyId)
    .order('numero', { ascending: false }).limit(1).single()
  const numeroOS = (lastOS?.numero ?? 0) + 1

  const { error } = await service.from('ordens_servico').insert({
    company_id: companyId, numero: numeroOS,
    contact_id: orc.contact_id, vendedor: orc.vendedor,
    status: 'emitida', itens: orc.itens, desconto: orc.desconto, total: orc.total,
    observacoes: `Convertido do orçamento #${orc.numero}. ${orc.observacoes ?? ''}`.trim(),
  })
  if (error) return { error: 'Erro ao converter em O.S.' }

  await service.from('orcamentos').update({ status: 'convertido' }).eq('id', orcamentoId).eq('company_id', companyId)

  revalidatePath('/dashboard/orcamentos')
  revalidatePath('/dashboard/ordens-servico')
  return { success: true, numeroOS }
}

export async function deleteOrcamento(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('orcamentos').delete().eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao excluir.' }
  revalidatePath('/dashboard/orcamentos')
  return { success: true }
}
