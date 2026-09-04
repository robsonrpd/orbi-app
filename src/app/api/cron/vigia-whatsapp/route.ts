import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { horaBrasil } from '@/lib/atendimento'

export const maxDuration = 55

/** Silêncio tolerado antes de avisar. Curto o bastante pra agir no mesmo dia. */
const HORAS_SILENCIO = 3
/** Não avisa de novo antes disso, pra não virar spam enquanto o problema não é resolvido. */
const HORAS_ENTRE_AVISOS = 12

/**
 * Vigia de recebimento do WhatsApp.
 *
 * O aviso de desconexão que já existe depende de a Evolution API AVISAR que caiu.
 * Quando é a própria Evolution que morre, ela não avisa nada — e o sistema fica mudo
 * sem ninguém perceber. Já aconteceu duas vezes: uma parou 9 dias, outra 2 dias, e nas
 * duas quem descobriu foi o dono estranhando a falta de mensagem.
 *
 * Este vigia inverte a lógica: em vez de esperar um aviso de falha, ele desconfia do
 * silêncio. Se uma empresa está conectada e não recebe mensagem nenhuma há horas,
 * durante o horário comercial, alguma coisa está errada.
 */
export async function POST(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  // De madrugada o silêncio é normal — avisar aí só geraria alarme falso.
  const hora = horaBrasil()
  if (hora < 9 || hora >= 20) {
    return NextResponse.json({ ok: true, motivo: 'fora do horário comercial' })
  }

  const service = createServiceClient()
  const agora = Date.now()
  const avisadas: string[] = []

  const { data: empresas } = await service.from('companies').select('id, name, settings')

  for (const empresa of empresas ?? []) {
    const s = (empresa.settings ?? {}) as Record<string, unknown>
    // só interessa quem deveria estar recebendo mensagem agora
    if (!s.wa_instance || s.wa_state !== 'open') continue

    const { data: ultima } = await service.from('conversations')
      .select('last_message_at').eq('company_id', empresa.id)
      .order('last_message_at', { ascending: false }).limit(1).maybeSingle()

    const ultimaEm = (ultima as { last_message_at?: string } | null)?.last_message_at
    if (!ultimaEm) continue // empresa sem nenhuma conversa ainda: nada a vigiar

    const horasParado = (agora - new Date(ultimaEm).getTime()) / 3_600_000
    if (horasParado < HORAS_SILENCIO) continue

    const avisadoEm = s.wa_silencio_avisado_em as string | undefined
    if (avisadoEm && (agora - new Date(avisadoEm).getTime()) / 3_600_000 < HORAS_ENTRE_AVISOS) continue

    await avisarSilencio(service, { id: empresa.id, name: empresa.name }, Math.round(horasParado))
    await service.from('companies')
      .update({ settings: { ...s, wa_silencio_avisado_em: new Date().toISOString() } })
      .eq('id', empresa.id)
    avisadas.push(empresa.name)
  }

  return NextResponse.json({ ok: true, avisadas })
}

async function avisarSilencio(
  service: ReturnType<typeof createServiceClient>,
  company: { id: string; name: string }, horas: number,
) {
  try {
    const destinos = new Set<string>()
    const { data: admins } = await service.from('users')
      .select('email').eq('company_id', company.id).eq('role', 'admin')
    for (const a of admins ?? []) if (a.email) destinos.add(a.email as string)
    // o dono do Orbi precisa saber mesmo que o cliente não perceba
    for (const e of (process.env.SUPER_ADMIN_EMAILS ?? '').split(',')) {
      const t = e.trim()
      if (t) destinos.add(t)
    }
    if (destinos.size === 0) return

    const url = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    for (const to of destinos) {
      await sendEmail({
        to,
        subject: `⚠️ Nenhuma mensagem há ${horas}h — ${company.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#E0383D">O WhatsApp parou de receber mensagens</h2>
            <p>A empresa <strong>${company.name}</strong> aparece como conectada, mas não recebe
            nenhuma mensagem há <strong>${horas} horas</strong>.</p>
            <p>Se o movimento estiver normal no celular, o problema é na conexão — e as mensagens
            que chegarem enquanto isso <strong>não serão salvas</strong>.</p>
            <p><a href="${url}/dashboard/ia" style="background:#1A56FF;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Verificar a conexão</a></p>
            <p style="color:#8C8880;font-size:13px">Se a tela mostrar "conectado" e ainda assim nada chegar,
            o servidor de WhatsApp pode estar fora do ar.</p>
          </div>`,
      })
    }
  } catch (err) {
    console.error('[vigia avisoSilencio]', err)
  }
}
