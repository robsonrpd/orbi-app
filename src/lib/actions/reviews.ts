'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

/**
 * Envio PÚBLICO de avaliação (sem autenticação).
 * A empresa é resolvida pelo slug — nunca por um id vindo do cliente.
 * Entra como "em análise" (visible=false) para o dono moderar antes de publicar.
 */
export async function submitReview(payload: {
  slug: string
  authorName: string
  rating: number
  comment: string
}) {
  const slug = (payload.slug ?? '').trim()
  if (!slug) return { error: 'Loja não identificada.' }

  const rating = Math.round(Number(payload.rating))
  if (!rating || rating < 1 || rating > 5) return { error: 'Selecione de 1 a 5 estrelas.' }

  const service = createServiceClient()
  const { data: company } = await service.from('companies').select('id').eq('slug', slug).single()
  if (!company) return { error: 'Loja não encontrada.' }

  const { error } = await service.from('reviews' as never).insert({
    company_id: company.id,
    author_name: (payload.authorName ?? '').trim() || null,
    rating,
    comment: (payload.comment ?? '').trim() || null,
    visible: false,
  } as never)

  if (error) {
    console.error('submitReview:', error)
    return { error: 'Erro ao enviar avaliação. Tente novamente.' }
  }
  return { success: true }
}

/** Publica/oculta uma avaliação (apenas dono da empresa). */
export async function toggleReviewVisible(id: string, visible: boolean) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('reviews' as never)
    .update({ visible } as never)
    .eq('id', id).eq('company_id', companyId)

  if (error) return { error: 'Erro ao atualizar.' }
  revalidatePath('/dashboard/avaliacoes')
  return { success: true }
}

/** Exclui uma avaliação (apenas dono da empresa). */
export async function deleteReview(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('reviews' as never)
    .delete().eq('id', id).eq('company_id', companyId)

  if (error) return { error: 'Erro ao excluir.' }
  revalidatePath('/dashboard/avaliacoes')
  return { success: true }
}
