import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { horaBrasil } from '@/lib/atendimento'
import { listarInstancias } from '@/lib/evolution'

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

  // Estado REAL, direto da Evolution. Antes isto usava o wa_state guardado no banco, que
  // é atualizado por webhook e fica velho: uma loja conectada e recebendo aparecia como
  // 'connecting' e o vigia a ignorava — justamente a loja que ele deveria estar vigiando.
  let { ok: evoOk, estados } = await listarInstancias()
  if (!evoOk) {
    // uma falha isolada de rede não pode virar alarme: confirma com uma segunda tentativa
    await new Promise(r => setTimeout(r, 4000))
    ;({ ok: evoOk, estados } = await listarInstancias())
  }
  if (!evoOk) {
    // Servidor de WhatsApp FORA DO AR. Sem isto o vigia ficava calado justamente quando o problema era o
    // servidor: em 08/10 o Evolution parou e ninguém foi avisado por 13 dias — as lojas seguiram
    // atendendo pelo celular enquanto o Orbi não recebia nada. Avisa só o fundador (o dono da loja não
    // tem o que fazer), no máximo uma vez a cada 12 h.
    const avisou = await avisarServidorFora(service)
    return NextResponse.json({ ok: false, motivo: 'servidor de WhatsApp não respondeu', fundadorAvisado: avisou })
  }

  const { data: empresas } = await service.from('companies').select('id, name, settings')

  for (const empresa of empresas ?? []) {
    const s = (empresa.settings ?? {}) as Record<string, unknown>
    // só interessa quem deveria estar recebendo mensagem agora
    if (!s.wa_instance || estados.get(s.wa_instance as string) !== 'open') continue

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

/**
 * E-mail ao fundador: o servidor de WhatsApp não responde. Devolve true se enviou agora.
 * Limite de 1 aviso por janela de 12 h, controlado por uma chave única na tabela de deduplicação
 * (a primeira rodada da janela grava a chave e envia; as outras batem na chave e não enviam).
 */
async function avisarServidorFora(service: ReturnType<typeof createServiceClient>): Promise<boolean> {
  try {
    const janela = Math.floor(Date.now() / (HORAS_ENTRE_AVISOS * 3_600_000))
    const { error } = await service.from('whatsapp_mensagens_processadas' as never)
      .insert({ message_id: `alerta-servidor-whatsapp:${janela}` } as never)
    if (error) return false // 23505 = já avisou nesta janela (ou o banco falhou: melhor não repetir e-mail)

    const destinos = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
    const url = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    for (const to of destinos) {
      await sendEmail({
        to,
        subject: '🚨 Servidor de WhatsApp FORA DO AR — nenhuma loja está recebendo mensagens',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#E0383D">O servidor de WhatsApp (Evolution, no Railway) não responde</h2>
            <p>O Orbi tentou falar com ele duas vezes e não obteve resposta. Enquanto isso, <strong>nenhuma loja
            recebe mensagens no Orbi</strong> — no celular delas tudo segue normal, o que torna o problema fácil de
            passar despercebido.</p>
            <p><strong>O que verificar, nesta ordem:</strong></p>
            <ol>
              <li>Railway, <em>Billing</em>: fatura em aberto ou crédito/teste esgotado.</li>
              <li>Railway, projeto do Evolution: o serviço está parado ou com falha no deploy?</li>
              <li><a href="https://status.railway.com">status.railway.com</a>: há incidente da plataforma?</li>
            </ol>
            <p style="color:#8C8880;font-size:13px">Você recebe este aviso no máximo a cada ${HORAS_ENTRE_AVISOS} horas, enquanto durar.
            ${url ? `<br/>Painel: ${url}/founder` : ''}</p>
          </div>`,
      })
    }
    return destinos.length > 0
  } catch (err) {
    console.error('[vigia avisarServidorFora]', err)
    return false
  }
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
