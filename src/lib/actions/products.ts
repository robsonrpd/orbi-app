'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { getModo } from '@/lib/auth/modo'
import { montarEan13Interno, sequencialDoEan13Interno } from '@/lib/codigo-barras'
import { revalidatePath } from 'next/cache'

/**
 * Próximo código interno livre da empresa. Continua a numeração a partir do maior
 * código interno já usado — códigos de fábrica (que não começam com 2) são ignorados
 * na contagem, então a numeração da loja não é afetada por eles.
 */
async function proximoCodigoInterno(
  service: ReturnType<typeof createServiceClient>, companyId: string, jaUsados: string[] = [],
) {
  const { data } = await service.from('products')
    .select('codigo_barras').eq('company_id', companyId).not('codigo_barras', 'is', null)
  let maior = 0
  for (const codigo of [...(data ?? []).map(p => p.codigo_barras as string), ...jaUsados]) {
    const seq = sequencialDoEan13Interno((codigo ?? '').trim())
    if (seq !== null && seq > maior) maior = seq
  }
  return montarEan13Interno(maior + 1)
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
  categoria?: string
  imageUrl?: string | null
  codigoBarras?: string | null
  tamanho?: string | null
  cor?: string | null
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  if (!payload.name?.trim()) return { error: 'Nome obrigatório.' }
  if (isNaN(payload.price) || payload.price < 0) return { error: 'Preço inválido.' }

  const service = createServiceClient()
  // sem código informado, a loja não tem etiqueta de fábrica pra essa peça:
  // o Orbi cria um código interno para ela poder ser impressa e bipada
  const codigo = payload.codigoBarras?.trim() || await proximoCodigoInterno(service, companyId)

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
    image_url: payload.imageUrl ?? null,
    codigo_barras: codigo,
    tamanho: payload.tamanho?.trim() || null,
    cor: payload.cor?.trim() || null,
    active: true,
  }).select().single()

  if (error) {
    console.error('createProduct:', error)
    // 23505 = código de barras já usado por outro produto ativo da mesma empresa
    if (error.code === '23505') return { error: 'Já existe um produto ativo com esse código de barras.' }
    return { error: 'Erro ao cadastrar produto.' }
  }

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

export async function updateProduct(id: string, payload: {
  name: string
  price: number
  costPrice: number
  tipoProduto: string
  ncm: string
  grife: string
  controlaEstoque: boolean
  imageUrl?: string | null
  codigoBarras?: string | null
  tamanho?: string | null
  cor?: string | null
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!payload.name?.trim()) return { error: 'Nome obrigatório.' }

  const service = createServiceClient()
  const { data: existing } = await service.from('products').select('id, price, cost_price').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Produto não encontrado.' }

  // Modo Funcionário com bloqueio de preços: ignora alteração de preço/custo
  const modo = await getModo()
  const precoBloqueado = modo.funcionario && modo.bloqueios.includes('precos')

  const { error } = await service.from('products').update({
    name: payload.name.trim(),
    price: precoBloqueado ? existing.price : payload.price,
    cost_price: precoBloqueado ? existing.cost_price : (payload.costPrice || 0),
    tipo_produto: payload.tipoProduto || null,
    ncm: payload.ncm || null,
    grife: payload.grife?.trim() || null,
    controla_estoque: payload.controlaEstoque,
    image_url: payload.imageUrl ?? null,
    codigo_barras: payload.codigoBarras?.trim() || null,
    tamanho: payload.tamanho?.trim() || null,
    cor: payload.cor?.trim() || null,
  }).eq('id', id).eq('company_id', companyId)

  if (error) {
    if (error.code === '23505') return { error: 'Já existe um produto ativo com esse código de barras.' }
    return { error: 'Erro ao atualizar produto.' }
  }
  revalidatePath('/dashboard/produtos')
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

/**
 * Cria código de barras interno para todas as peças ativas que ainda não têm um.
 * Usado quando a loja não trabalha com etiqueta de fábrica e precisa imprimir as próprias.
 */
export async function gerarCodigosBarras() {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: produtos } = await service.from('products')
    .select('id, codigo_barras').eq('company_id', companyId).eq('active', true).order('created_at')

  const semCodigo = (produtos ?? []).filter(p => !(p.codigo_barras as string | null)?.trim())
  if (semCodigo.length === 0) return { success: true as const, gerados: 0 }

  const novos: string[] = []
  for (const p of semCodigo) {
    const codigo = await proximoCodigoInterno(service, companyId, novos)
    const { error } = await service.from('products')
      .update({ codigo_barras: codigo }).eq('id', p.id).eq('company_id', companyId)
    if (error) return { error: 'Erro ao gerar os códigos. Tente de novo.' }
    novos.push(codigo)
  }

  revalidatePath('/dashboard/produtos')
  return { success: true as const, gerados: novos.length }
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
