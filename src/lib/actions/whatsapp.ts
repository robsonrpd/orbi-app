'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { evolutionConfigurado, criarInstancia, setWebhook, statusInstancia, deletarInstancia } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

function webhookUrl() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN
  // token secreto na URL: só a Evolution conhece, bloqueia POSTs forjados de terceiros
  return token ? `${base}/api/whatsapp/webhook?token=${encodeURIComponent(token)}` : `${base}/api/whatsapp/webhook`
}

async function getCompany() {
  const companyId = await getCompanyId()
  if (!companyId) return null
  const service = createServiceClient()
  const { data } = await service.from('companies').select('id, slug, settings').eq('id', companyId).single()
  return data as { id: string; slug: string; settings: Record<string, unknown> } | null
}

/** Nome da instância ativa (guardado em settings). Cada conexão usa um nome novo, sessão limpa. */
function instanciaDe(c: { slug: string; settings: Record<string, unknown> }) {
  return (c.settings?.wa_instance as string) || c.slug
}

/** Inicia a conexão: cria uma instância NOVA (sessão limpa) + webhook. O QR chega via webhook. */
export async function conectarWhatsApp() {
  if (!evolutionConfigurado()) return { error: 'WhatsApp ainda não configurado no servidor (EVOLUTION_API_URL / KEY).' }
  const c = await getCompany()
  if (!c) return { error: 'Não autenticado.' }

  const atual = instanciaDe(c)
  const wh = webhookUrl()

  // se já está conectado, nada a fazer
  const st0 = await statusInstancia(atual)
  if (st0.state === 'open') return { conectado: true }

  // apaga a instância anterior (limpa a sessão morta) e cria UMA NOVA com nome único
  await deletarInstancia(atual)
  await deletarInstancia(c.slug) // limpa também a antiga baseada no slug, se existir
  await new Promise(res => setTimeout(res, 1200))

  const instance = `${c.slug}-${Date.now().toString(36)}`
  const r = await criarInstancia(instance, wh)
  await setWebhook(instance, wh)

  const service = createServiceClient()
  const settings = { ...(c.settings ?? {}), wa_instance: instance } as Record<string, unknown>
  delete settings.wa_qr
  if (r.qr) settings.wa_qr = r.qr
  await service.from('companies').update({ settings }).eq('id', c.id)

  return { aguardando: true, qr: r.qr ?? null }
}

/** Busca o QR (recebido via webhook) + o estado da conexão. */
export async function obterQR() {
  const c = await getCompany()
  if (!c) return { qr: null, state: 'close' as const }

  const st = await statusInstancia(instanciaDe(c))
  if (st.state === 'open') return { qr: null, state: 'open' as const }

  const s = (c.settings ?? {}) as { wa_qr?: string; wa_last_event?: string }
  const qr = s.wa_qr ?? null
  return { qr, state: st.state as 'connecting' | 'close', debug: qr ? undefined : s.wa_last_event }
}

/** Gera um novo QR recriando a instância. */
export async function renovarQR() {
  if (!evolutionConfigurado()) return { error: 'WhatsApp não configurado.' }
  return conectarWhatsApp()
}

/** Consulta o estado da conexão. */
export async function statusWhatsApp() {
  if (!evolutionConfigurado()) return { state: 'nao_configurado' as const }
  const c = await getCompany()
  if (!c) return { state: 'close' as const }
  const st = await statusInstancia(instanciaDe(c))
  return { state: st.state as 'open' | 'connecting' | 'close' }
}

/** Desconecta o WhatsApp da empresa. */
export async function desconectarWhatsApp() {
  const c = await getCompany()
  if (!c) return { error: 'Não autenticado.' }
  await deletarInstancia(instanciaDe(c))
  const service = createServiceClient()
  const settings = { ...(c.settings ?? {}) } as Record<string, unknown>
  delete settings.wa_qr
  await service.from('companies').update({ settings }).eq('id', c.id)
  revalidatePath('/dashboard/ia')
  return { success: true }
}
