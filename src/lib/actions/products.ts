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

export async function createProduct(payload: {
  name: string
  price: number
  costPrice: number
  stock: number
  tipoProduto: string
  ncm: string
  grife: string
  controlaEstoque: boolean
  categoria?: 'otica' | 'diversos'
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  if (!payload.name?.trim()) return { error: 'Nome obrigatório.' }
  if (isNaN(payload.price) || payload.price < 0) return { error: 'Preço inválido.' }

  const service = createServiceClient()
  const { data: product, error } = await service.from('products').insert({
    company_id: companyId,
    name: payload.name.trim(),
    price: payload.price,
    cost_price: payload.costPrice || 0,
    stock: payload.stock || 0,
    tipo_produto: payload.tipoProduto || null,
    ncm: payload.ncm || null,
    grife: payload.grife?.trim() || null,
    controla_estoque: payload.controlaEstoque,
    categoria: payload.categoria ?? 'otica',
    active: true,
  }).select().single()

  if (error) return { error: 'Erro ao cadastrar produto.' }

  // Registra entrada inicial de estoque
  if (payload.stock > 0 && product) {
    await service.from('movimentacoes_estoque').insert({
      company_id: companyId, product_id: product.id, tipo: 'entrada',
      quantidade: payload.stock, motivo: 'Estoque inicial',
    })
  }

  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('products').update({ active: false }).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao remover.' }
  revalidatePath('/dashboard/produtos')
  return { success: true }
}

export async function movimentarEstoque(payload: {
  productId: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo: string
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!payload.quantidade || payload.quantidade <= 0) return { error: 'Quantidade inválida.' }

  const service = createServiceClient()

  // Busca produto (valida posse)
  const { data: product } = await service
    .from('products').select('id, stock').eq('id', payload.productId).eq('company_id', companyId).single()
  if (!product) return { error: 'Produto não encontrado.' }

  let novoEstoque = product.stock
  if (payload.tipo === 'entrada') novoEstoque += payload.quantidade
  else if (payload.tipo === 'saida') novoEstoque = Math.max(0, novoEstoque - payload.quantidade)
  else novoEstoque = payload.quantidade // ajuste = define valor absoluto

  await service.from('products').update({ stock: novoEstoque }).eq('id', payload.productId).eq('company_id', companyId)
  await service.from('movimentacoes_estoque').insert({
    company_id: companyId, product_id: payload.productId,
    tipo: payload.tipo, quantidade: payload.quantidade, motivo: payload.motivo?.trim() || null,
  })

  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard')
  return { success: true }
}
