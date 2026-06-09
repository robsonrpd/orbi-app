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

export async function createReceita(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const contactId = formData.get('contact_id') as string
  if (!contactId) return { error: 'Selecione um cliente.' }

  const service = createServiceClient()

  // Valida que o cliente pertence à empresa
  const { data: contact } = await service
    .from('contacts').select('id').eq('id', contactId).eq('company_id', companyId).single()
  if (!contact) return { error: 'Cliente não encontrado.' }

  const get = (k: string) => {
    const v = formData.get(k) as string
    return v?.trim() ? v.trim() : null
  }

  const { error } = await service.from('receitas').insert({
    company_id: companyId,
    contact_id: contactId,
    medico: get('medico'),
    data_receita: get('data_receita') || new Date().toISOString().split('T')[0],
    od_esferico: get('od_esferico'),
    od_cilindrico: get('od_cilindrico'),
    od_eixo: get('od_eixo'),
    od_dnp: get('od_dnp'),
    od_altura: get('od_altura'),
    oe_esferico: get('oe_esferico'),
    oe_cilindrico: get('oe_cilindrico'),
    oe_eixo: get('oe_eixo'),
    oe_dnp: get('oe_dnp'),
    oe_altura: get('oe_altura'),
    adicao: get('adicao'),
    observacoes: get('observacoes'),
  })

  if (error) return { error: 'Erro ao salvar receita.' }

  revalidatePath('/dashboard/receitas')
  return { success: true }
}

export async function deleteReceita(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { error } = await service.from('receitas').delete().eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao excluir receita.' }

  revalidatePath('/dashboard/receitas')
  return { success: true }
}
