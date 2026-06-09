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

export async function abrirCaixa(saldoInicial: number) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  // Garante que não há caixa aberto
  const { data: aberto } = await service
    .from('caixas').select('id').eq('company_id', companyId).eq('status', 'aberto').limit(1).single()
  if (aberto) return { error: 'Já existe um caixa aberto.' }

  const { error } = await service.from('caixas').insert({
    company_id: companyId, saldo_inicial: saldoInicial || 0, status: 'aberto',
  })
  if (error) return { error: 'Erro ao abrir caixa.' }
  revalidatePath('/dashboard/caixa')
  return { success: true }
}

export async function movimentarCaixa(caixaId: string, tipo: 'entrada' | 'saida', valor: number, descricao: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!valor || valor <= 0) return { error: 'Valor inválido.' }

  const service = createServiceClient()
  // Valida caixa aberto da empresa
  const { data: caixa } = await service
    .from('caixas').select('id, total_entradas, total_saidas')
    .eq('id', caixaId).eq('company_id', companyId).eq('status', 'aberto').single()
  if (!caixa) return { error: 'Caixa não encontrado ou já fechado.' }

  await service.from('caixa_movimentos').insert({
    company_id: companyId, caixa_id: caixaId, tipo, valor, descricao: descricao?.trim() || null,
  })

  const novoEntradas = Number(caixa.total_entradas) + (tipo === 'entrada' ? valor : 0)
  const novoSaidas = Number(caixa.total_saidas) + (tipo === 'saida' ? valor : 0)
  await service.from('caixas').update({ total_entradas: novoEntradas, total_saidas: novoSaidas })
    .eq('id', caixaId).eq('company_id', companyId)

  revalidatePath('/dashboard/caixa')
  return { success: true }
}

export async function fecharCaixa(caixaId: string, valorContado: number, observacoes: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: caixa } = await service
    .from('caixas').select('*').eq('id', caixaId).eq('company_id', companyId).eq('status', 'aberto').single()
  if (!caixa) return { error: 'Caixa não encontrado.' }

  const esperado = Number(caixa.saldo_inicial) + Number(caixa.total_entradas) - Number(caixa.total_saidas)
  const diferenca = (valorContado || 0) - esperado

  const { error } = await service.from('caixas').update({
    status: 'fechado', saldo_final: valorContado || 0, diferenca,
    observacoes: observacoes?.trim() || null, fechado_em: new Date().toISOString(),
  }).eq('id', caixaId).eq('company_id', companyId)
  if (error) return { error: 'Erro ao fechar caixa.' }

  revalidatePath('/dashboard/caixa')
  return { success: true, diferenca, esperado }
}
