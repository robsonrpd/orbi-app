'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

/** Registra uma indicação feita pela ótica (programa "Ganhe uma Mensalidade"). */
export async function criarIndicacao(payload: {
  colaborador: string
  indicadoNome: string
  indicadoEmail: string
  indicadoTelefone: string
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!payload.indicadoNome?.trim()) return { error: 'Informe o nome do indicado.' }

  const service = createServiceClient()
  const { error } = await service.from('indicacoes' as never).insert({
    company_id: companyId,
    colaborador: payload.colaborador?.trim() || null,
    indicado_nome: payload.indicadoNome.trim(),
    indicado_email: payload.indicadoEmail?.trim() || null,
    indicado_telefone: (payload.indicadoTelefone ?? '').replace(/\D/g, '') || null,
    status: 'novo',
  } as never)

  if (error) return { error: 'Erro ao registrar indicação. Tente novamente.' }
  revalidatePath('/dashboard/indicacoes')
  return { success: true }
}
