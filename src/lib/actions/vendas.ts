'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

type ItemVenda = { product_id: string; nome: string; valor: number; qtd: number }

/**
 * Registra uma venda de produtos:
 * 1. Baixa o estoque de cada produto (+ movimentação)
 * 2. Cria o registro da venda
 * 3. Lança entrada no caixa aberto (se houver)
 * 4. Cria transação paga (para faturamento/dashboard)
 */
export async function registrarVenda(payload: {
  itens: ItemVenda[]
  contactId: string | null
  clienteNome: string
  vendedor: string
  formaPagamento: string
  dataVenda?: string | null
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!payload.itens?.length) return { error: 'Adicione ao menos um produto.' }
  if (!payload.formaPagamento) return { error: 'Escolha a forma de pagamento.' }

  // Data da venda (permite registrar venda passada). Default: agora.
  let dataISO = new Date().toISOString()
  if (payload.dataVenda && !isNaN(new Date(payload.dataVenda).getTime())) {
    dataISO = new Date(payload.dataVenda).toISOString()
  }

  const service = createServiceClient()

  // SEGURANÇA: se um cliente foi informado, valida que pertence a esta empresa
  // (impede vincular a venda a um contato de outra ótica)
  let contactIdValido = payload.contactId
  if (contactIdValido) {
    const { data: contact } = await service
      .from('contacts').select('id').eq('id', contactIdValido).eq('company_id', companyId).single()
    if (!contact) return { error: 'Cliente não encontrado.' }
  }

  // 1. Valida produtos e estoque
  for (const item of payload.itens) {
    const { data: prod } = await service
      .from('products').select('id, stock, controla_estoque')
      .eq('id', item.product_id).eq('company_id', companyId).single()
    if (!prod) return { error: `Produto "${item.nome}" não encontrado.` }
    if (prod.controla_estoque !== false && prod.stock < item.qtd) {
      return { error: `Estoque insuficiente de "${item.nome}" (disponível: ${prod.stock}).` }
    }
  }

  const total = payload.itens.reduce((s, i) => s + Number(i.valor) * Number(i.qtd), 0)

  // 2. Baixa estoque + registra movimentação
  for (const item of payload.itens) {
    const { data: prod } = await service
      .from('products').select('stock, controla_estoque').eq('id', item.product_id).eq('company_id', companyId).single()
    if (prod && prod.controla_estoque !== false) {
      await service.from('products').update({ stock: Math.max(0, prod.stock - item.qtd) })
        .eq('id', item.product_id).eq('company_id', companyId)
      await service.from('movimentacoes_estoque').insert({
        company_id: companyId, product_id: item.product_id, tipo: 'saida',
        quantidade: item.qtd, motivo: 'Venda',
      })
    }
  }

  // 3. Número sequencial da venda
  const { data: last } = await service
    .from('vendas').select('numero').eq('company_id', companyId)
    .order('numero', { ascending: false }).limit(1).single()
  const numero = (last?.numero ?? 0) + 1

  // 4. Caixa aberto?
  const { data: caixa } = await service
    .from('caixas').select('id, total_entradas').eq('company_id', companyId).eq('status', 'aberto').limit(1).single()

  // 5. Cria a venda
  const { error: vendaError } = await service.from('vendas').insert({
    company_id: companyId, numero,
    contact_id: contactIdValido,
    cliente_nome: payload.clienteNome?.trim() || null,
    vendedor: payload.vendedor?.trim() || null,
    itens: payload.itens, total,
    forma_pagamento: payload.formaPagamento,
    caixa_id: caixa?.id ?? null,
    created_at: dataISO,
  })
  if (vendaError) return { error: 'Erro ao registrar venda.' }

  // 6. Lança no caixa (se aberto)
  if (caixa) {
    await service.from('caixa_movimentos').insert({
      company_id: companyId, caixa_id: caixa.id, tipo: 'entrada',
      valor: total, descricao: `Venda #${numero}`, created_at: dataISO,
    })
    await service.from('caixas').update({ total_entradas: Number(caixa.total_entradas) + total })
      .eq('id', caixa.id).eq('company_id', companyId)
  }

  // 7. Transação paga (faturamento)
  await service.from('transactions').insert({
    company_id: companyId, contact_id: contactIdValido, amount: total,
    status: 'paid', paid_at: dataISO, created_at: dataISO,
    forma_pagamento: payload.formaPagamento,
    notes: `Venda #${numero} — produtos`,
  })

  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard/caixa')
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true, numero, total, noCaixa: !!caixa }
}
