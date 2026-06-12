'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { evolutionConfigurado, criarInstancia, conectar, statusInstancia, desconectarInstancia } from '@/lib/evolution'
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
  const r = await criarInstancia(instance, webhookUrl())
  if (!r.qr) {
    // pode já estar conectado
    const st = await statusInstancia(instance)
    if (st.state === 'open') return { conectado: true }
    return { error: 'Não foi possível gerar o QR. Tente novamente.' }
  }

  const service = createServiceClient()
  const settings = { ...(c.settings ?? {}), wa_instance: instance }
  await service.from('companies').update({ settings }).eq('id', c.id)

  return { qr: r.qr }
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
