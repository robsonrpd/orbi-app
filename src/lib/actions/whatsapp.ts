'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { evolutionConfigurado, criarInstancia, setWebhook, statusInstancia, desconectarInstancia, deletarInstancia } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

function webhookUrl() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  return `${base}/api/whatsapp/webhook`
}

async function getCompany() {
  const companyId = await getCompanyId()
  if (!companyId) return null
  const service = createServiceClient()
  const { data } = await service.from('companies').select('id, slug, settings').eq('id', companyId).single()
  return data as { id: string; slug: string; settings: Record<string, unknown> } | null
}

/** Inicia a conexão: cria a instância (nome = slug) + webhook e retorna o QR code. */
export async function conectarWhatsApp() {
  if (!evolutionConfigurado()) return { error: 'WhatsApp ainda não configurado no servidor (EVOLUTION_API_URL / KEY).' }
  const c = await getCompany()
  if (!c) return { error: 'Não autenticado.' }

  const instance = c.slug
  const wh = webhookUrl()

  // se já está conectado, nada a fazer
  const st0 = await statusInstancia(instance)
  if (st0.state === 'open') return { conectado: true }

  // apaga qualquer instância antiga travada e cria do zero
  await deletarInstancia(instance)
  await new Promise(res => setTimeout(res, 1000))
  const r = await criarInstancia(instance, wh)
  await setWebhook(instance, wh)

  // limpa QR antigo e guarda o nome da instância
  const service = createServiceClient()
  const settings = { ...(c.settings ?? {}), wa_instance: instance } as Record<string, unknown>
  delete settings.wa_qr
  delete settings.wa_last_event
  if (r.qr) settings.wa_qr = r.qr
  await service.from('companies').update({ settings }).eq('id', c.id)

  // retorna a resposta crua da criação direto (sem corrida no banco)
  const createDebug = JSON.stringify((r as { createData?: unknown }).createData).slice(0, 700)
  return { aguardando: true, qr: r.qr ?? null, createDebug }
}

/** Busca o QR (webhook OU connect direto) + o estado da conexão. */
export async function obterQR() {
  const c = await getCompany()
  if (!c) return { qr: null, state: 'close' as const }

  const st = await statusInstancia(c.slug)
  if (st.state === 'open') return { qr: null, state: 'open' as const }

  // QR recebido via webhook (qrcode.updated)
  const s = (c.settings ?? {}) as { wa_qr?: string; wa_last_event?: string }
  const qr = s.wa_qr ?? null
  return { qr, state: st.state as 'connecting' | 'close', debug: qr ? undefined : `EVENT=${s.wa_last_event ?? 'aguardando'}` }
}

/** Gera um novo QR (refresh) recriando a instância. */
export async function renovarQR() {
  if (!evolutionConfigurado()) return { error: 'WhatsApp não configurado.' }
  return conectarWhatsApp()
}

/** Consulta o estado da conexão. */
export async function statusWhatsApp() {
  if (!evolutionConfigurado()) return { state: 'nao_configurado' as const }
  const c = await getCompany()
  if (!c) return { state: 'close' as const }
  const st = await statusInstancia(c.slug)
  return { state: st.state as 'open' | 'connecting' | 'close' }
}

/** Desconecta o WhatsApp da empresa. */
export async function desconectarWhatsApp() {
  const c = await getCompany()
  if (!c) return { error: 'Não autenticado.' }
  await desconectarInstancia(c.slug)
  revalidatePath('/dashboard/ia')
  return { success: true }
}
