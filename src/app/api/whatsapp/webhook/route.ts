import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/claude/buildSystemPrompt'
import { enviarTexto, getMediaBase64 } from '@/lib/evolution'
import { sendEmail } from '@/lib/email'

// Evolution chama este endpoint a cada mensagem recebida (evento MESSAGES_UPSERT).
export async function POST(req: NextRequest) {
  // valida o token secreto (se configurado) — barra POSTs forjados de terceiros
  const tokenEsperado = process.env.WHATSAPP_WEBHOOK_TOKEN
  if (tokenEsperado && req.nextUrl.searchParams.get('token') !== tokenEsperado) {
    return NextResponse.json({ ok: true }) // responde 200 genérico, sem revelar que existe proteção
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const instance = (body.instance as string) || ''
  const evento = ((body.event as string) || '').toLowerCase().replace(/_/g, '.')
  const raw = body.data
  if (!instance) return NextResponse.json({ ok: true })

  // identifica a empresa pela instância. O nome é "<slug>-<timestamp>" (timestamp sem hífen),
  // então removo o último segmento pra obter o slug. Mantém fallback pro slug exato (legado).
  type Comp = { id: string; name: string; ai_name: string | null; ai_context: string | null; business_type: string | null; slug: string; settings: Record<string, unknown> }
  const service = createServiceClient()
  const sel = 'id, name, ai_name, ai_context, business_type, slug, settings'
  const slugCandidato = instance.replace(/-[a-z0-9]+$/i, '')

  let company = (await service.from('companies').select(sel).eq('slug', slugCandidato).maybeSingle()).data as Comp | null
  if (!company) company = (await service.from('companies').select(sel).eq('slug', instance).maybeSingle()).data as Comp | null
  if (!company) return NextResponse.json({ ok: true })

  // conexão mudou → registra estado, limpa QR se abriu, avisa por e-mail se caiu
  if (evento.includes('connection')) {
    const d = raw as { state?: string; statusReason?: number } | null
    const settings = { ...(company.settings as Record<string, unknown>) }
    const estadoAnterior = settings.wa_state as string | undefined
    settings.wa_last_event = `state=${d?.state} reason=${d?.statusReason}`
    settings.wa_state = d?.state

    if (d?.state === 'open') {
      delete settings.wa_qr
      delete settings.wa_disconnect_alert_sent
    } else if (d?.state === 'close' && estadoAnterior !== 'close' && !settings.wa_disconnect_alert_sent) {
      settings.wa_disconnect_alert_sent = true
      await avisarDesconexao(service, company)
    }

    await service.from('companies').update({ settings }).eq('id', company.id)
    return NextResponse.json({ ok: true })
  }

  // QR atualizado → guarda o base64 para o painel exibir
  if (evento.includes('qrcode')) {
    const d = raw as { qrcode?: { base64?: string } | string; base64?: string } | null
    const base64 =
      (typeof d?.qrcode === 'object' ? d?.qrcode?.base64 : undefined)
      ?? d?.base64
      ?? (typeof d?.qrcode === 'string' ? d.qrcode : undefined)
      ?? null
    if (base64) {
      const settings = { ...(company.settings as Record<string, unknown>), wa_qr: base64 }
      await service.from('companies').update({ settings }).eq('id', company.id)
    }
    return NextResponse.json({ ok: true })
  }


  // a partir daqui, só mensagens
  if (evento && !evento.includes('messages')) return NextResponse.json({ ok: true })
  const eventos = Array.isArray(raw) ? raw : raw ? [raw] : []
  if (eventos.length === 0) return NextResponse.json({ ok: true })

  const iaPausada = !!(company.settings as { ia_pausada?: boolean })?.ia_pausada
  const claude = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null

  // contatos da empresa (id por últimos 8 dígitos do telefone) — captura sem duplicar
  const { data: contatos } = await service.from('contacts').select('id, phone').eq('company_id', company.id)
  const idPorChave = new Map<string, string>()
  for (const c of contatos ?? []) {
    const k = (c.phone ?? '').replace(/\D/g, '').slice(-8)
    if (k) idPorChave.set(k, c.id)
  }

  for (const ev of eventos) {
    const e = ev as { key?: { remoteJid?: string; fromMe?: boolean }; message?: Record<string, unknown>; pushName?: string }
    const jid = e.key?.remoteJid ?? ''
    if (jid.endsWith('@g.us')) continue      // ignora grupos
    const numero = jid.split('@')[0]
    if (!numero) continue
    const chave = numero.replace(/\D/g, '').slice(-8)

    // monta o conteúdo: texto, legenda ou rótulo da mídia (foto/áudio/doc/etc.)
    const msg = e.message ?? {}
    const cap = (m: unknown) => (m as { caption?: string })?.caption
    const texto = (msg.conversation as string)
      ?? (msg.extendedTextMessage as { text?: string })?.text
      ?? cap(msg.imageMessage) ?? cap(msg.videoMessage) ?? cap(msg.documentMessage)
      ?? ''
    const docNome = (msg.documentMessage as { fileName?: string })?.fileName
    const midiaTipo = msg.imageMessage ? 'image'
      : msg.videoMessage ? 'video'
      : (msg.audioMessage || msg.pttMessage) ? 'audio'
      : (msg.documentMessage ? 'document' : null)
    const rotulo = midiaTipo === 'image' ? '📷 Imagem'
      : midiaTipo === 'video' ? '🎥 Vídeo'
      : midiaTipo === 'audio' ? '🎤 Áudio'
      : midiaTipo === 'document' ? `📎 ${docNome || 'Documento'}`
      : msg.stickerMessage ? '😀 Figurinha'
      : msg.locationMessage ? '📍 Localização'
      : msg.contactMessage ? '👤 Contato'
      : null
    const conteudo = texto.trim() || rotulo
    if (!conteudo) continue

    // baixa a mídia (se houver) e guarda no Storage → URL pública pra exibir no chat
    let midia: Midia | undefined
    if (midiaTipo) {
      const url = await baixarMidia(service, company.id, instance, ev, msg, midiaTipo, docNome)
      if (url) midia = { tipo: midiaTipo, url, nome: docNome }
    }

    // mensagem enviada PELA LOJA (pelo celular ou pelo Orbi) → registra como saída sem duplicar o eco do Orbi
    if (e.key?.fromMe) {
      await registrarSaida(service, company.id, numero, conteudo, midia)
      continue
    }

    // CAPTURA AUTOMÁTICA: número novo vira lead no funil ("Novo Lead")
    let contactId = chave ? idPorChave.get(chave) : undefined
    if (chave && !contactId) {
      const { data: novo, error: capErr } = await service.from('contacts').insert({
        company_id: company.id, name: e.pushName?.trim() || null, phone: numero,
        origem: 'WhatsApp', funil_etapa: 'novo', active: true, criado_por: 'WhatsApp',
      } as never).select('id').single()
      if (capErr) console.error('[wh capErr]', capErr.message)
      contactId = (novo as { id?: string })?.id
      if (contactId && chave) idPorChave.set(chave, contactId)
    }

    let reply: string | null = null
    let escalou = false
    if (texto.trim() && !iaPausada && claude) {
      try {
        const resp = await claude.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: buildSystemPrompt(company),
          messages: [{ role: 'user', content: texto }],
        })
        const rawTxt = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
        escalou = rawTxt.trimStart().startsWith('[ESCALAR]')
        reply = rawTxt.replace('[ESCALAR]', '').trim() || null
        if (reply) await enviarTexto(instance, numero, reply)
      } catch (err) {
        console.error('whatsapp IA:', err)
      }
    }

    // salva/atualiza a conversa (histórico)
    await salvarConversa(service, company.id, contactId ?? null, numero, conteudo, reply, escalou, iaPausada, midia)
  }

  return NextResponse.json({ ok: true })
}

// Avisa por e-mail (dono da empresa + super-admins) que o WhatsApp caiu, em tempo real.
async function avisarDesconexao(
  service: ReturnType<typeof createServiceClient>,
  company: { id: string; name: string },
) {
  try {
    const { data: admins } = await service.from('users').select('email').eq('company_id', company.id).eq('role', 'admin')
    const destinos = new Set<string>()
    for (const a of admins ?? []) if (a.email) destinos.add(a.email as string)
    for (const e of (process.env.SUPER_ADMIN_EMAILS ?? '').split(',')) {
      const t = e.trim()
      if (t) destinos.add(t)
    }
    if (destinos.size === 0) return

    const url = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    for (const to of destinos) {
      await sendEmail({
        to,
        subject: `⚠️ WhatsApp desconectado — ${company.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#E0383D">WhatsApp desconectado</h2>
            <p>O WhatsApp da empresa <strong>${company.name}</strong> caiu e a IA/atendimento automático está parado.</p>
            <p>Reconecte o quanto antes para não deixar os clientes sem resposta:</p>
            <p><a href="${url}/dashboard/ia" style="background:#1A56FF;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Reconectar WhatsApp</a></p>
            <p style="color:#8C8880;font-size:13px">Vá em Conexão & IA → Conectar e escaneie o QR code.</p>
          </div>`,
      })
    }
  } catch (err) {
    console.error('[wh avisoDesconexao]', err)
  }
}

type Midia = { tipo: string; url: string; nome?: string }
type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: Midia; ts?: string }

const EXT: Record<string, string> = { image: 'jpg', audio: 'ogg', video: 'mp4', document: 'bin' }

// Baixa a mídia de uma mensagem (do payload base64 ou via endpoint) e guarda no Storage. Retorna a URL pública.
async function baixarMidia(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, instance: string, ev: unknown, msg: Record<string, unknown>,
  tipo: string, nome?: string,
): Promise<string | null> {
  try {
    let b64 = (msg.base64 as string) || ((ev as { base64?: string })?.base64) || null
    const mime = (msg[`${tipo}Message`] as { mimetype?: string })?.mimetype || null
    if (!b64) {
      const r = await getMediaBase64(instance, ev)
      b64 = r.base64
    }
    if (!b64) return null
    const buf = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ''), 'base64')
    const ext = (nome && nome.includes('.')) ? nome.split('.').pop() : EXT[tipo] || 'bin'
    const path = `${companyId}/wa/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await service.storage.from('fotos').upload(path, buf, { contentType: mime || undefined, upsert: false })
    if (error) { console.error('[wh midia]', error.message); return null }
    return service.storage.from('fotos').getPublicUrl(path).data.publicUrl
  } catch (err) { console.error('[wh midia]', err); return null }
}

// Registra uma mensagem de saída (enviada pela loja) sem duplicar o eco do que o Orbi já enviou.
async function registrarSaida(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, numero: string, conteudo: string, midia?: Midia,
) {
  const { data: conv } = await service.from('conversations')
    .select('id, messages').eq('company_id', companyId).eq('numero', numero).maybeSingle()
  const anteriores = (conv?.messages as Msg[] | undefined) ?? []
  // dedup: se a última mensagem registrada já é esse conteúdo (eco do envio pelo Orbi), ignora
  const ultima = anteriores[anteriores.length - 1]
  if (ultima && (ultima.role === 'human' || ultima.role === 'assistant') && ultima.content === conteudo) return
  const novas: Msg[] = [...anteriores, { role: 'human' as const, content: conteudo, ts: new Date().toISOString(), ...(midia ? { midia } : {}) }].slice(-40)
  const patch = { messages: novas, last_message_at: new Date().toISOString() }
  if (conv) await service.from('conversations').update(patch).eq('id', (conv as { id: string }).id)
  else await service.from('conversations').insert({ company_id: companyId, contact_id: null, numero, ...patch } as never)
}

async function salvarConversa(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, contactId: string | null, numero: string,
  userMsg: string, aiReply: string | null, escalou: boolean, iaPausada: boolean, midia?: Midia,
) {
  const { data: conv } = await service.from('conversations')
    .select('id, messages').eq('company_id', companyId).eq('numero', numero).maybeSingle()

  const anteriores = (conv?.messages as Msg[] | undefined) ?? []
  const agora = new Date().toISOString()
  const novas: Msg[] = [...anteriores, { role: 'user', content: userMsg, ts: agora, ...(midia ? { midia } : {}) }]
  if (aiReply) novas.push({ role: 'assistant', content: aiReply, ts: agora })

  const patch: Record<string, unknown> = {
    messages: novas.slice(-40),
    last_message_at: new Date().toISOString(),
    handled_by_ai: !!aiReply && !iaPausada,
  }
  if (escalou) patch.escalated_at = new Date().toISOString()

  if (conv) {
    const { error } = await service.from('conversations').update(patch).eq('id', (conv as { id: string }).id)
    if (error) console.error('[wh convUpd]', error.message)
  } else {
    const { error } = await service.from('conversations').insert({ company_id: companyId, contact_id: contactId, numero, ...patch } as never)
    if (error) console.error('[wh convIns]', error.message)
  }
}
