'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

/** Salva o nome do negócio e o nome do usuário logado (tela Configurações / Meu Perfil). */
export async function salvarDadosConta(payload: { nomeUsuario: string; nomeEmpresa: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const nomeUsuario = payload.nomeUsuario?.trim()
  const nomeEmpresa = payload.nomeEmpresa?.trim()
  if (!nomeUsuario) return { error: 'Informe seu nome.' }
  if (!nomeEmpresa) return { error: 'Informe o nome do negócio.' }
  if (nomeUsuario.length > 200 || nomeEmpresa.length > 200) return { error: 'Nome muito longo.' }

  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Empresa não encontrada.' }

  const service = createServiceClient()
  const [{ error: errUser }, { error: errCompany }] = await Promise.all([
    service.from('users').update({ name: nomeUsuario }).eq('id', user.id),
    service.from('companies').update({ name: nomeEmpresa }).eq('id', companyId),
  ])
  if (errUser || errCompany) return { error: 'Erro ao salvar.' }

  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/settings')
  return { success: true }
}
