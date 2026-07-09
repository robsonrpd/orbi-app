'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { FUNIL_ETAPAS, type FunilColuna } from '@/lib/funil'
import { revalidatePath } from 'next/cache'

const MAX_COLUNAS = 12

/** Colunas do funil da empresa — personalizadas, ou o padrão se ela nunca mexeu. */
export async function obterColunasFunil(): Promise<FunilColuna[]> {
  const companyId = await getCompanyId()
  if (!companyId) return FUNIL_ETAPAS
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const custom = (data?.settings as { funil_colunas?: FunilColuna[] } | null)?.funil_colunas
  return custom && custom.length > 0 ? custom : FUNIL_ETAPAS
}

/** Salva a personalização das colunas do funil. Bloqueia remover coluna que ainda tem leads. */
export async function salvarColunasFunil(colunas: FunilColuna[]) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  if (!colunas || colunas.length === 0) return { error: 'Adicione pelo menos uma coluna.' }
  if (colunas.length > MAX_COLUNAS) return { error: `Máximo de ${MAX_COLUNAS} colunas.` }

  const keys = colunas.map(c => c.key.trim())
  if (keys.some(k => !k)) return { error: 'Erro interno de identificação da coluna.' }
  if (new Set(keys).size !== keys.length) return { error: 'Há colunas duplicadas.' }
  for (const c of colunas) {
    if (!c.label?.trim()) return { error: 'Toda coluna precisa de um nome.' }
    if (c.label.trim().length > 40) return { error: 'Nome de coluna muito longo (máx. 40 caracteres).' }
  }

  const service = createServiceClient()
  const { data: atual } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settingsAtuais = (atual?.settings as Record<string, unknown> ?? {})
  const colunasAtuais = ((settingsAtuais.funil_colunas as FunilColuna[] | undefined) ?? FUNIL_ETAPAS)

  // não deixa remover coluna que ainda tem leads dentro dela
  const removidas = colunasAtuais.filter(c => !keys.includes(c.key)).map(c => c.key)
  if (removidas.length > 0) {
    const { count } = await service.from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).in('funil_etapa', removidas)
    if ((count ?? 0) > 0) {
      const nomes = colunasAtuais.filter(c => removidas.includes(c.key)).map(c => c.label).join(', ')
      return { error: `Mova os ${count} lead(s) que estão em "${nomes}" antes de excluir essa(s) coluna(s).` }
    }
  }

  const settings = {
    ...settingsAtuais,
    funil_colunas: colunas.map(c => ({ key: c.key.trim(), label: c.label.trim(), cor: c.cor, bg: c.bg })),
  }
  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar as colunas.' }

  revalidatePath('/dashboard/funil')
  return { success: true as const }
}

/** Volta as colunas do funil pro padrão do Orbi (mesma checagem de leads presos). */
export async function restaurarColunasFunilPadrao() {
  return salvarColunasFunil(FUNIL_ETAPAS)
}
