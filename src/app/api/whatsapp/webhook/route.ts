import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/claude/buildSystemPrompt'
import { enviarTexto } from '@/lib/evolution'

// Evolution chama este endpoint a cada mensagem recebida (evento MESSAGES_UPSERT).
export async function POST(req: NextRequest) {
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

  // registra o último evento de conexão (para diagnóstico)
  if (evento.includes('connection')) {
    const d = raw as { state?: string; statusReason?: number } | null
    await service.from('companies')
      .update({ settings: { ...(company.settings as Record<string, unknown>), wa_last_event: `state=${d?.state} reason=${d?.statusReason}` } })
      .eq('id', company.id)
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

  // conexão mudou → se abriu, limpa o QR
  if (evento.includes('connection')) {
    const d = raw as { state?: string } | null
    if (d?.state === 'open') {
      const s = { ...(company.settings as Record<string, unknown>) }
      delete s.wa_qr
      await service.from('companies').update({ settings: s }).eq('id', company.id)
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
    if (e.key?.fromMe) continue              // ignora as próprias mensagens (evita loop)
    if (jid.endsWith('@g.us')) continue      // ignora grupos
    const numero = jid.split('@')[0]
    if (!numero) continue
    const chave = numero.replace(/\D/g, '').slice(-8)

    // CAPTURA AUTOMÁTICA: número novo vira lead no funil ("Novo Lead")
    let contactId = chave ? idPorChave.get(chave) : undefined
    if (chave && !contactId) {
      const { data: novo } = await service.from('contacts').insert({
        company_id: company.id, name: e.pushName?.trim() || null, phone: numero,
        origem: 'WhatsApp', funil_etapa: 'novo', active: true,
      } as never).select('id').single()
      contactId = (novo as { id?: string })?.id
      if (contactId && chave) idPorChave.set(chave, contactId)
    }

    const msg = e.message ?? {}
    const texto = (msg.conversation as string)
      ?? (msg.extendedTextMessage as { text?: string })?.text
      ?? ''
    if (!texto.trim()) continue

    let reply: string | null = null
    let escalou = false
    if (!iaPausada && claude) {
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
    await salvarConversa(service, company.id, contactId ?? null, numero, texto, reply, escalou, iaPausada)
  }

  return NextResponse.json({ ok: true })
}

type Msg = { role: 'user' | 'assistant'; content: string }

async function salvarConversa(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, contactId: string | null, numero: string,
  userMsg: string, aiReply: string | null, escalou: boolean, iaPausada: boolean,
) {
  const { data: conv } = await service.from('conversations')
    .select('id, messages').eq('company_id', companyId).eq('numero', numero).maybeSingle()

  const anteriores = (conv?.messages as Msg[] | undefined) ?? []
  const novas: Msg[] = [...anteriores, { role: 'user', content: userMsg }]
  if (aiReply) novas.push({ role: 'assistant', content: aiReply })

  const patch: Record<string, unknown> = {
    messages: novas.slice(-40),
    last_message_at: new Date().toISOString(),
    handled_by_ai: !!aiReply && !iaPausada,
  }
  if (escalou) patch.escalated_at = new Date().toISOString()

  if (conv) {
    await service.from('conversations').update(patch).eq('id', (conv as { id: string }).id)
  } else {
    await service.from('conversations').insert({ company_id: companyId, contact_id: contactId, numero, ...patch } as never)
  }
}
