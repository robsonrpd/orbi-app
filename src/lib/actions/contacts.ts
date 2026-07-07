'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId, getCurrentUserName } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

function extractFields(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k) as string
    return v?.trim() ? v.trim() : null
  }
  const tagsRaw = formData.get('tags') as string
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const lgpd = (formData.get('lgpd_consent') as string) || 'nao_informado'
  const active = formData.get('active') !== 'false'

  return {
    name: get('name'),
    phone: get('phone'),
    email: get('email'),
    cep: get('cep'),
    endereco: get('endereco'),
    numero: get('numero'),
    complemento: get('complemento'),
    bairro: get('bairro'),
    cidade: get('cidade'),
    uf: get('uf'),
    data_nascimento: get('data_nascimento'),
    origem: get('origem'),
    notes: get('notes'),
    tags,
    lgpd_consent: lgpd,
    active,
  }
}

export async function createContact(formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const f = extractFields(formData)
  if (!f.phone) return { error: 'Telefone é obrigatório.' }
  if (f.phone.length > 20) return { error: 'Telefone inválido.' }
  if (f.name && f.name.length > 200) return { error: 'Nome muito longo.' }

  const criadoPor = await getCurrentUserName()
  const service = createServiceClient()
  const { error } = await service.from('contacts').insert({
    company_id: companyId,
    ...f,
    criado_por: criadoPor,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Este telefone já está cadastrado.' }
    return { error: 'Erro ao cadastrar cliente.' }
  }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}

export async function updateContact(id: string, formData: FormData) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: existing } = await service
    .from('contacts').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Contato não encontrado.' }

  const f = extractFields(formData)
  if (!f.phone) return { error: 'Telefone é obrigatório.' }

  const { error } = await service.from('contacts').update(f).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao atualizar cliente.' }

  revalidatePath('/dashboard/clientes')
  revalidatePath(`/dashboard/clientes/${id}`)
  return { success: true }
}

const MAX_IMPORT_ROWS = 1000

/** Importa contatos em lote (vindos de uma planilha Excel/CSV lida no navegador). */
export async function importarContatos(rows: { name: string | null; phone: string; email: string | null; origem: string | null }[]) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!Array.isArray(rows) || rows.length === 0) return { error: 'Nenhuma linha para importar.' }
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Máximo de ${MAX_IMPORT_ROWS} linhas por importação.` }

  const criadoPor = await getCurrentUserName()
  const batchId = crypto.randomUUID()
  const service = createServiceClient()
  const { data: existentes } = await service.from('contacts').select('phone').eq('company_id', companyId)
  const telefonesExistentes = new Set((existentes ?? []).map(c => c.phone))

  let criados = 0, jaExistiamNoOrbi = 0, duplicadosNaPlanilha = 0, invalidos = 0
  const vistosNestaImportacao = new Set<string>()

  for (const r of rows) {
    const phone = (r.phone ?? '').replace(/\D/g, '')
    if (!phone || phone.length < 8 || phone.length > 20) { invalidos++; continue }
    if (telefonesExistentes.has(phone)) { jaExistiamNoOrbi++; continue }
    if (vistosNestaImportacao.has(phone)) { duplicadosNaPlanilha++; continue }

    const name = r.name?.trim().slice(0, 200) || null
    const email = r.email?.trim().slice(0, 200) || null
    const origem = r.origem?.trim().slice(0, 100) || 'Importação'

    const { error } = await service.from('contacts').insert({
      company_id: companyId, name, phone, email, origem, lgpd_consent: 'nao_informado', active: true,
      criado_por: criadoPor ? `${criadoPor} (planilha)` : 'Importação (planilha)',
      import_batch_id: batchId,
    } as never)
    if (!error) { criados++; vistosNestaImportacao.add(phone) } else { invalidos++ }
  }

  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard/funil')
  return { success: true, criados, jaExistiamNoOrbi, duplicadosNaPlanilha, invalidos, batchId }
}

/** Lista as importações de planilha já feitas (agrupadas por lote), mais recentes primeiro. */
export async function listarImportacoes() {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data } = await service.from('contacts')
    .select('import_batch_id, criado_por, created_at, origem')
    .eq('company_id', companyId).eq('origem', 'Importação')
    .order('created_at', { ascending: false })

  const porLote = new Map<string, { total: number; criadoPor: string | null; dataMaisRecente: string }>()
  let semLote = 0
  ;(data ?? []).forEach(c => {
    const lote = (c as { import_batch_id: string | null }).import_batch_id
    if (!lote) { semLote++; return }
    const atual = porLote.get(lote)
    if (!atual) porLote.set(lote, { total: 1, criadoPor: c.criado_por, dataMaisRecente: c.created_at })
    else atual.total++
  })

  const lotes = [...porLote.entries()].map(([batchId, v]) => ({ batchId, ...v }))
  return { lotes, semLote }
}

/** Exclui apenas os contatos de UMA importação específica (identificada pelo lote). */
export async function excluirImportacao(batchId: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!batchId) return { error: 'Lote inválido.' }

  const service = createServiceClient()
  const { data: contatos } = await service.from('contacts')
    .select('id').eq('company_id', companyId).eq('import_batch_id', batchId as never)
  if (!contatos || contatos.length === 0) return { success: true, excluidos: 0, falharam: 0 }

  let excluidos = 0, falharam = 0
  for (const c of contatos) {
    const { error } = await service.from('contacts').delete().eq('id', c.id).eq('company_id', companyId)
    if (error) falharam++; else excluidos++
  }

  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard/funil')
  return { success: true, excluidos, falharam }
}

/** Conta contatos de importações antigas sem lote identificado (feitas antes do rastreio por lote existir). */
export async function contarImportados() {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { count } = await service.from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('origem', 'Importação').is('import_batch_id', null)
  return { total: count ?? 0 }
}

/** Exclui os contatos de importações antigas sem lote identificado. */
export async function excluirImportados() {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: contatos } = await service.from('contacts')
    .select('id').eq('company_id', companyId).eq('origem', 'Importação').is('import_batch_id', null)
  if (!contatos || contatos.length === 0) return { success: true, excluidos: 0, falharam: 0 }

  let excluidos = 0, falharam = 0
  for (const c of contatos) {
    const { error } = await service.from('contacts').delete().eq('id', c.id).eq('company_id', companyId)
    if (error) falharam++; else excluidos++
  }

  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard/funil')
  return { success: true, excluidos, falharam }
}

export async function deleteContact(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data: existing } = await service
    .from('contacts').select('id').eq('id', id).eq('company_id', companyId).single()
  if (!existing) return { error: 'Cliente não encontrado.' }

  const { error } = await service.from('contacts').delete().eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao excluir. O cliente pode ter vendas/agendamentos vinculados.' }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}
