'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { evolutionConfigurado, criarInstancia, conectar, setWebhook, statusInstancia, desconectarInstancia, deletarInstancia } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

function webhookUrl() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const token = process.env.EVOLUTION_WEBHOOK_TOKEN
  return `${base}/api/whatsapp/webhook${token ? `?token=${token}` : ''}`
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

  // apaga qualquer instância antiga travada e cria do zero (QR vem na criação)
  await deletarInstancia(instance)
  await new Promise(res => setTimeout(res, 1000))
  const r = await criarInstancia(instance, wh)
  await setWebhook(instance, wh)

  // o QR pode vir assíncrono — tenta algumas vezes
  let qr = r.qr ?? null
  for (let i = 0; i < 5 && !qr; i++) {
    await new Promise(res => setTimeout(res, 1500))
    const conn = await conectar(instance)
    qr = conn.qr
  }
  if (!qr) {
    const debug = JSON.stringify({ createStatus: (r as { createStatus?: number }).createStatus, createData: (r as { createData?: unknown }).createData ?? r.raw }).slice(0, 500)
    return { error: `Sem QR após recriar. Evolution: ${debug}` }
  }

  const service = createServiceClient()
  const settings = { ...(c.settings ?? {}), wa_instance: instance }
  await service.from('companies').update({ settings }).eq('id', c.id)

  return { qr }
}

/** Gera um novo QR (refresh) sem recriar a instância. */
export async function renovarQR() {
  if (!evolutionConfigurado()) return { error: 'WhatsApp não configurado.' }
  const c = await getCompany()
  if (!c) return { error: 'Não autenticado.' }
  const r = await conectar(c.slug)
  return { qr: r.qr }
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
