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

/**
 * Inicia a conexão: cria uma instância NOVA (sessão limpa) + webhook. O QR chega via webhook.
 *
 * `forcar`: refaz a conexão MESMO com o WhatsApp conectado ("Reconectar e importar histórico"). O WhatsApp só
 * entrega o histórico antigo das conversas quando um aparelho é pareado, então importar histórico de uma loja
 * que já está conectada exige parear de novo (QR). Sem `forcar`, uma conexão aberta é deixada em paz.
 */
export async function conectarWhatsApp(opts?: { forcar?: boolean }) {
  if (!evolutionConfigurado()) return { error: 'WhatsApp ainda não configurado no servidor (EVOLUTION_API_URL / KEY).' }
  const c = await getCompany()
  if (!c) return { error: 'Não autenticado.' }

  const atual = instanciaDe(c)
  const wh = webhookUrl()

  // se já está conectado, nada a fazer (a não ser que a pessoa tenha pedido pra reconectar)
  const st0 = await statusInstancia(atual)
  if (st0.state === 'open' && !opts?.forcar) return { conectado: true }

  // Conectar é DESTRUTIVO: apaga a sessão atual pra criar outra. Só que statusInstancia
  // devolve 'close' também quando a Evolution não responde (timeout, 500, servidor fora).
  // Sem esta checagem, um problema no servidor virava "sessão morta" e o botão apagava uma
  // conexão que estava viva — foi assim que a loja perdeu o WhatsApp durante uma queda.
  // "instância não existe" é o caso normal de uma loja nova: aí não há sessão a proteger
  if (!st0.ok && !st0.naoExiste) {
    return { error: 'O servidor de WhatsApp não respondeu agora. Não vou recriar a conexão às cegas: se a sessão atual estiver viva, isso derrubaria ela. Tente de novo em alguns minutos.' }
  }

  // Cria a instância NOVA (nome único) ANTES de apagar a antiga: se a criação falhar, a conexão atual da loja
  // continua intacta. (Antes apagava primeiro e, se a nova não nascesse, a loja ficava sem WhatsApp.)
  const instance = `${c.slug}-${Date.now().toString(36)}`
  const r = await criarInstancia(instance, wh)

  // Confirma que a instância existe MESMO antes de apontar a empresa pra ela. Já aconteceu
  // de a criação falhar em silêncio e o Orbi ficar apontando pra uma instância fantasma:
  // a tela pedia QR pra sempre e nenhuma mensagem chegava.
  const chk = await statusInstancia(instance)
  if (!chk.ok) {
    return { error: 'Não consegui criar a nova conexão no servidor de WhatsApp. A conexão atual NÃO foi alterada — tente de novo em instantes.' }
  }

  await setWebhook(instance, wh)

  const service = createServiceClient()
  const settings = { ...(c.settings ?? {}), wa_instance: instance } as Record<string, unknown>
  // instância nova ainda não tem sessão: o estado antigo precisa sair daqui, senão a tela
  // acha que já está conectada e nunca mostra o QR desta instância
  delete settings.wa_qr
  delete settings.wa_state
  delete settings.wa_last_event
  delete settings.wa_disconnect_alert_sent
  delete settings.wa_silencio_avisado_em
  if (r.qr) settings.wa_qr = r.qr
  // zera o placar do histórico: o que chegar a partir de agora é desta conexão (a tela mostra o andamento)
  settings.wa_historico = { pedidoEm: new Date().toISOString(), mensagens: 0, conversas: 0, leads: 0, blocos: 0 }
  await service.from('companies').update({ settings }).eq('id', c.id)

  // Só AGORA apaga a antiga (desvincula o aparelho e limpa a sessão), com a empresa já apontando pra nova:
  // o Evolution avisa "desconectou" ao apagar, e o webhook ignora avisos de conexões que não são a atual.
  // Apagar antes de apontar mandaria e-mail de "WhatsApp caiu" numa reconexão proposital.
  if (atual !== instance) await deletarInstancia(atual)
  if (c.slug !== atual) await deletarInstancia(c.slug) // limpa também a antiga baseada no slug, se existir
  await new Promise(res => setTimeout(res, 1200))

  return { aguardando: true, qr: r.qr ?? null }
}

/** "Reconectar e importar histórico": refaz a conexão da loja (novo QR) pra o WhatsApp entregar o histórico das conversas. */
export async function reconectarImportandoHistorico() {
  return conectarWhatsApp({ forcar: true })
}

export type HistoricoImportado = {
  pedidoEm: string | null; mensagens: number; conversas: number; leads: number; blocos: number; atualizadoEm: string | null
}

/** Andamento da importação do histórico da conexão atual (null = nunca pedida). */
export async function obterHistoricoImportado(): Promise<HistoricoImportado | null> {
  const c = await getCompany()
  if (!c) return null
  const h = (c.settings?.wa_historico ?? null) as Partial<HistoricoImportado> | null
  if (!h) return null
  return {
    pedidoEm: h.pedidoEm ?? null, mensagens: Number(h.mensagens) || 0, conversas: Number(h.conversas) || 0,
    leads: Number(h.leads) || 0, blocos: Number(h.blocos) || 0, atualizadoEm: h.atualizadoEm ?? null,
  }
}

/** Busca o QR (recebido via webhook) + o estado da conexão. */
export async function obterQR() {
  const c = await getCompany()
  if (!c) return { qr: null, state: 'close' as const }

  const s = (c.settings ?? {}) as { wa_qr?: string; wa_last_event?: string; wa_state?: string }
  // o evento de conexão (webhook) costuma chegar antes/mais confiável que o endpoint de status
  // ao vivo da Evolution — sem isso, a tela pode ficar presa em "gerando QR" mesmo já conectado
  if (s.wa_state === 'open') return { qr: null, state: 'open' as const }

  const st = await statusInstancia(instanciaDe(c))
  if (st.state === 'open') return { qr: null, state: 'open' as const }

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
  if ((c.settings as { wa_state?: string })?.wa_state === 'open') return { state: 'open' as const }
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
  // Apaga TODO o rastro da conexão anterior. Guardar o estado antigo fazia a tela
  // continuar dizendo "conectado" depois de desconectar, e o QR nunca aparecia —
  // era impossível reconectar quando a sessão morria do lado do servidor.
  delete settings.wa_qr
  delete settings.wa_state
  delete settings.wa_last_event
  delete settings.wa_instance
  delete settings.wa_disconnect_alert_sent
  delete settings.wa_silencio_avisado_em
  await service.from('companies').update({ settings }).eq('id', c.id)
  revalidatePath('/dashboard/ia')
  return { success: true }
}
