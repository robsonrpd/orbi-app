'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId, getCurrentUserName } from '@/lib/auth/company'
import { revalidatePath } from 'next/cache'

const INTERVALO_MIN = 8
const INTERVALO_MAX = 300
const LIMITE_MIN = 5
const LIMITE_MAX = 300

export type BroadcastResumo = {
  id: string; mensagem: string; intervalo_segundos: number; limite_diario: number
  status: string; enviados_hoje: number; erro: string | null; created_at: string
  total: number; enviados: number; falharam: number; pendentes: number
}

function waNumero(phone: string) {
  const d = (phone || '').replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}

/** Lista as origens distintas dos contatos da empresa (para filtrar o público do envio). */
export async function listarOrigensDeContatos() {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const service = createServiceClient()
  const { data } = await service.from('contacts').select('origem').eq('company_id', companyId).not('origem', 'is', null)
  const set = new Set((data ?? []).map(c => c.origem).filter(Boolean) as string[])
  return [...set].sort()
}

/** Cria uma campanha de envio em massa e a fila de destinatários. Só permite 1 ativa por vez. */
export async function criarBroadcast(payload: {
  mensagem: string; todos: boolean; origens: string[]; intervaloSegundos: number; limiteDiario: number
}) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const mensagem = payload.mensagem?.trim()
  if (!mensagem) return { error: 'Escreva a mensagem.' }
  if (mensagem.length > 4000) return { error: 'Mensagem muito longa.' }
  if (!payload.todos && payload.origens.length === 0) return { error: 'Escolha "Todos os clientes" ou pelo menos uma origem.' }

  const intervaloSegundos = Math.min(INTERVALO_MAX, Math.max(INTERVALO_MIN, Math.round(payload.intervaloSegundos) || 15))
  const limiteDiario = Math.min(LIMITE_MAX, Math.max(LIMITE_MIN, Math.round(payload.limiteDiario) || 100))

  const service = createServiceClient()

  const { data: emAndamento } = await service.from('broadcasts' as never)
    .select('id').eq('company_id', companyId).eq('status', 'ativo').maybeSingle()
  if (emAndamento) return { error: 'Já existe um envio em massa em andamento. Pause ou cancele antes de criar um novo.' }

  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
  if (!instance) return { error: 'Conecte o WhatsApp em Conexão & IA antes de fazer um envio em massa.' }

  let query = service.from('contacts').select('id, name, phone, origem').eq('company_id', companyId).eq('active', true)
  if (!payload.todos) query = query.in('origem', payload.origens)
  const { data: contatos } = await query

  const destinatarios = (contatos ?? [])
    .filter(c => c.phone)
    .map(c => ({ contact_id: c.id, numero: waNumero(c.phone), nome: c.name ?? '' }))
  if (destinatarios.length === 0) return { error: 'Nenhum cliente com telefone encontrado para esse público.' }

  const criadoPor = await getCurrentUserName()
  const { data: broadcast, error: bErr } = await service.from('broadcasts' as never).insert({
    company_id: companyId, mensagem, intervalo_segundos: intervaloSegundos, limite_diario: limiteDiario,
    status: 'ativo', created_by: criadoPor,
  } as never).select('id').single()
  if (bErr || !broadcast) return { error: 'Erro ao criar o envio em massa.' }

  const broadcastId = (broadcast as { id: string }).id
  const linhas = destinatarios.map(d => ({ broadcast_id: broadcastId, ...d, status: 'pendente' }))
  const { error: dErr } = await service.from('broadcast_destinatarios' as never).insert(linhas as never)
  if (dErr) {
    await service.from('broadcasts' as never).delete().eq('id', broadcastId)
    return { error: 'Erro ao montar a lista de envio.' }
  }

  revalidatePath('/dashboard/envio-massa')
  return { success: true, total: destinatarios.length }
}

async function contarStatus(service: ReturnType<typeof createServiceClient>, broadcastId: string) {
  const [{ count: total }, { count: enviados }, { count: falharam }, { count: pendentes }] = await Promise.all([
    service.from('broadcast_destinatarios' as never).select('id', { count: 'exact', head: true }).eq('broadcast_id', broadcastId),
    service.from('broadcast_destinatarios' as never).select('id', { count: 'exact', head: true }).eq('broadcast_id', broadcastId).eq('status', 'enviado'),
    service.from('broadcast_destinatarios' as never).select('id', { count: 'exact', head: true }).eq('broadcast_id', broadcastId).eq('status', 'falhou'),
    service.from('broadcast_destinatarios' as never).select('id', { count: 'exact', head: true }).eq('broadcast_id', broadcastId).eq('status', 'pendente'),
  ])
  return { total: total ?? 0, enviados: enviados ?? 0, falharam: falharam ?? 0, pendentes: pendentes ?? 0 }
}

/** Retorna o envio ativo/pausado atual da empresa (se houver), com o progresso. */
export async function obterBroadcastAtivo(): Promise<BroadcastResumo | null> {
  const companyId = await getCompanyId()
  if (!companyId) return null
  const service = createServiceClient()
  const { data: b } = await service.from('broadcasts' as never)
    .select('*').eq('company_id', companyId).in('status', ['ativo', 'pausado']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!b) return null
  const row = b as { id: string; mensagem: string; intervalo_segundos: number; limite_diario: number; status: string; enviados_hoje: number; erro: string | null; created_at: string }
  const counts = await contarStatus(service, row.id)
  return { ...row, ...counts }
}

/** Histórico de envios concluídos/cancelados. */
export async function listarHistoricoBroadcasts(): Promise<BroadcastResumo[]> {
  const companyId = await getCompanyId()
  if (!companyId) return []
  const service = createServiceClient()
  const { data } = await service.from('broadcasts' as never)
    .select('*').eq('company_id', companyId).in('status', ['concluido', 'cancelado']).order('created_at', { ascending: false }).limit(20)
  const rows = (data ?? []) as { id: string; mensagem: string; intervalo_segundos: number; limite_diario: number; status: string; enviados_hoje: number; erro: string | null; created_at: string }[]
  const resultados: BroadcastResumo[] = []
  for (const r of rows) resultados.push({ ...r, ...(await contarStatus(service, r.id)) })
  return resultados
}

export async function pausarBroadcast(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('broadcasts' as never).update({ status: 'pausado' } as never).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao pausar.' }
  revalidatePath('/dashboard/envio-massa')
  return { success: true }
}

export async function retomarBroadcast(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('broadcasts' as never).update({ status: 'ativo', erro: null } as never).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao retomar.' }
  revalidatePath('/dashboard/envio-massa')
  return { success: true }
}

export async function cancelarBroadcast(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('broadcasts' as never).update({ status: 'cancelado' } as never).eq('id', id).eq('company_id', companyId)
  if (error) return { error: 'Erro ao cancelar.' }
  revalidatePath('/dashboard/envio-massa')
  return { success: true }
}
