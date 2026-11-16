import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

type Service = ReturnType<typeof createServiceClient>

export type AvisoPush = { titulo: string; corpo: string; url: string; tag?: string }

let configurado: boolean | null = null
function configurar() {
  if (configurado !== null) return configurado
  const publica = process.env.VAPID_PUBLIC_KEY, privada = process.env.VAPID_PRIVATE_KEY
  if (!publica || !privada) { configurado = false; return false }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://www.orbisistem.com.br', publica, privada)
  configurado = true
  return true
}

/**
 * Manda o aviso para todos os aparelhos da loja que ativaram as notificações.
 * Nunca lança erro e não demora mais que ~5 s (quem chama é o webhook, que não pode travar).
 * Aparelho que o serviço de push diz que não existe mais (404/410) é removido.
 */
export async function enviarPushEmpresa(service: Service, companyId: string, aviso: AvisoPush, soDoUsuario?: string): Promise<number> {
  try {
    if (!configurar()) return 0
    let q = service.from('push_inscricoes' as never).select('id, endpoint, p256dh, auth').eq('company_id', companyId)
    if (soDoUsuario) q = q.eq('user_id', soDoUsuario)
    const { data } = await q
    const inscricoes = (data ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[]
    if (inscricoes.length === 0) return 0

    const payload = JSON.stringify(aviso)
    const resultados = await Promise.allSettled(inscricoes.map(s =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload,
        { TTL: 6 * 3600, urgency: 'high', timeout: 5000, ...(aviso.tag ? { topic: aviso.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}) }),
    ))

    const mortas: string[] = []
    let enviados = 0
    resultados.forEach((r, i) => {
      if (r.status === 'fulfilled') { enviados++; return }
      const status = (r.reason as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) mortas.push(inscricoes[i].id)
      else console.error('[push]', status ?? '', (r.reason as Error)?.message ?? r.reason)
    })
    if (mortas.length) await service.from('push_inscricoes' as never).delete().in('id', mortas)
    return enviados
  } catch (err) {
    console.error('[push]', err)
    return 0
  }
}
