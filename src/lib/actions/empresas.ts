'use server'

import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ACTIVE_COMPANY_COOKIE, getEffectiveCompanyId } from '@/lib/auth/company'
import { NICHO_KEYS, NICHO_DEFAULT } from '@/lib/nichos'
import { revalidatePath } from 'next/cache'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'empresa'
}

export type MinhaEmpresa = { id: string; name: string; business_type: string | null; logo_url: string | null }

/** Lista as empresas que o login atual pode acessar (dono com múltiplas empresas). Vazio para funcionário. */
export async function listarMinhasEmpresas(): Promise<{ empresas: MinhaEmpresa[]; ativaId: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { empresas: [], ativaId: null }

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('role, company_id').eq('id', user.id).single()
  if (userData?.role === 'staff') return { empresas: [], ativaId: null }

  const { data: memberships } = await service.from('company_members' as never)
    .select('company_id').eq('user_id', user.id).order('created_at', { ascending: true })
  let ids = ((memberships ?? []) as { company_id: string }[]).map(m => m.company_id)
  if (ids.length === 0 && userData?.company_id) ids = [userData.company_id]
  if (ids.length === 0) return { empresas: [], ativaId: null }

  const { data: companies } = await service.from('companies').select('id, name, business_type, logo_url').in('id', ids)
  const empresas = ids
    .map(id => (companies ?? []).find(c => c.id === id))
    .filter((c): c is MinhaEmpresa => !!c)

  const ativaId = await getEffectiveCompanyId()
  return { empresas, ativaId }
}

/** Troca a empresa ativa do login atual. Valida que ele realmente tem acesso a ela. */
export async function trocarEmpresaAtiva(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  if (!companyId) return { error: 'Empresa inválida.' }

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id, role').eq('id', user.id).single()
  if (userData?.role === 'staff') return { error: 'Funcionário não pode trocar de empresa.' }

  const { data: membership } = await service.from('company_members' as never)
    .select('id').eq('user_id', user.id).eq('company_id', companyId).maybeSingle()
  const pertence = !!membership || userData?.company_id === companyId
  if (!pertence) return { error: 'Você não tem acesso a essa empresa.' }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Cria uma nova empresa vinculada ao MESMO login (dono com mais de um negócio) e já troca pra ela. */
export async function criarNovaEmpresa(payload: { nome: string; businessType: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('role, company_id').eq('id', user.id).single()
  if (userData?.role === 'staff') return { error: 'Apenas o dono pode criar novas empresas.' }

  const nome = payload.nome?.trim()
  if (!nome) return { error: 'Informe o nome da empresa.' }
  if (nome.length > 200) return { error: 'Nome muito longo.' }
  const ramo = NICHO_KEYS.includes(payload.businessType) ? payload.businessType : NICHO_DEFAULT

  const slug = `${toSlug(nome)}-${user.id.slice(0, 6)}-${Date.now().toString(36).slice(-4)}`

  const { data: company, error: companyError } = await service.from('companies').insert({
    name: nome, slug, business_type: ramo, settings: {},
  }).select('id').single()
  if (companyError || !company) return { error: 'Erro ao criar empresa.' }

  // garante que a empresa atual (legada) também vira membership antes de adicionar a nova,
  // senão o dono perderia o acesso a ela ao trocar pra empresa recém-criada
  const { data: existentes } = await service.from('company_members' as never).select('id').eq('user_id', user.id).limit(1)
  if ((!existentes || existentes.length === 0) && userData?.company_id) {
    await service.from('company_members' as never).insert({ user_id: user.id, company_id: userData.company_id })
  }

  const { error: memberError } = await service.from('company_members' as never)
    .insert({ user_id: user.id, company_id: company.id })
  if (memberError) {
    await service.from('companies').delete().eq('id', company.id)
    return { error: 'Erro ao vincular a nova empresa ao seu login.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_COMPANY_COOKIE, company.id, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true, companyId: company.id }
}
