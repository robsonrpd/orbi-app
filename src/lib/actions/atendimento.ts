'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { lerFluxo, lerSla, type FluxoAtendimento, type SlaAtendimento } from '@/lib/atendimento'
import { revalidatePath } from 'next/cache'

export async function obterAtendimento(): Promise<{ fluxo: FluxoAtendimento; sla: SlaAtendimento }> {
  const companyId = await getCompanyId()
  if (!companyId) return { fluxo: lerFluxo(null), sla: lerSla(null) }
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  return { fluxo: lerFluxo(data?.settings), sla: lerSla(data?.settings) }
}

export async function salvarFluxo(fluxo: FluxoAtendimento) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const etapas = (fluxo.etapas ?? []).filter(e => e.texto?.trim())
  if (fluxo.ativo && etapas.length === 0) return { error: 'Adicione pelo menos uma mensagem antes de ativar.' }
  if (etapas.length > 12) return { error: 'Máximo de 12 etapas.' }
  for (const e of etapas) {
    if (e.texto.length > 900) return { error: 'Cada mensagem pode ter no máximo 900 caracteres.' }
  }

  const service = createServiceClient()
  const { data: atual } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = {
    ...(atual?.settings as Record<string, unknown> ?? {}),
    fluxo_atendimento: {
      ativo: !!fluxo.ativo,
      maxSeguidas: Math.min(Math.max(fluxo.maxSeguidas ?? 4, 1), 6),
      atribuirVendedor: !!fluxo.atribuirVendedor,
      etapas: etapas.map(e => ({
        id: e.id, tipo: e.tipo, texto: e.texto.trim(),
        ...(e.tipo === 'pergunta' ? { rotulo: e.rotulo?.trim() || 'Resposta' } : {}),
      })),
    },
  }
  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar o fluxo.' }

  revalidatePath('/dashboard/atendimento')
  return { success: true as const }
}

export async function salvarSla(sla: SlaAtendimento) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (sla.minutosTransferencia <= sla.minutosAlerta) {
    return { error: 'O tempo para transferir precisa ser maior que o tempo do alerta.' }
  }

  const service = createServiceClient()
  const { data: atual } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = {
    ...(atual?.settings as Record<string, unknown> ?? {}),
    sla_atendimento: {
      ativo: !!sla.ativo,
      minutosAlerta: Math.max(sla.minutosAlerta, 5),
      minutosTransferencia: Math.max(sla.minutosTransferencia, 10),
      avisarWhatsapp: !!sla.avisarWhatsapp,
    },
  }
  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar os alertas.' }

  revalidatePath('/dashboard/atendimento')
  return { success: true as const }
}

/** Zera o roteiro de uma conversa, pra poder testar o fluxo do começo com o mesmo número. */
export async function reiniciarFluxoConversa(numero: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const d = (numero || '').replace(/\D/g, '')
  if (!d) return { error: 'Número inválido.' }

  const service = createServiceClient()
  const { data: convs } = await service.from('conversations')
    .select('id, numero').eq('company_id', companyId)
  const alvo = (convs ?? []).find(c => (c.numero ?? '').replace(/\D/g, '').slice(-8) === d.slice(-8))
  if (!alvo) return { error: 'Nenhuma conversa encontrada com esse número.' }

  await service.from('conversations')
    .update({ fluxo_etapa: null, sla_alertado_em: null, sla_transferido_em: null }).eq('id', alvo.id)
  return { success: true as const }
}
