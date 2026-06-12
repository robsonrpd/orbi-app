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

  // identifica a empresa pela instância (= slug)
  const service = createServiceClient()
  const { data: company } = await service
    .from('companies')
    .select('id, name, ai_name, ai_context, business_type, slug, settings')
    .eq('slug', instance).single()
  if (!company) return NextResponse.json({ ok: true })

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

  // IA pausada? (flag opcional em settings)
  if ((company.settings as { ia_pausada?: boolean })?.ia_pausada) return NextResponse.json({ ok: true })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: true })

  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  for (const ev of eventos) {
    const e = ev as { key?: { remoteJid?: string; fromMe?: boolean }; message?: Record<string, unknown> }
    const jid = e.key?.remoteJid ?? ''
    if (e.key?.fromMe) continue              // ignora as próprias mensagens (evita loop)
    if (jid.endsWith('@g.us')) continue      // ignora grupos
    const numero = jid.split('@')[0]
    if (!numero) continue

    const msg = e.message ?? {}
    const texto = (msg.conversation as string)
      ?? (msg.extendedTextMessage as { text?: string })?.text
      ?? ''
    if (!texto.trim()) continue

    try {
      const resp = await claude.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: buildSystemPrompt(company),
        messages: [{ role: 'user', content: texto }],
      })
      const rawTxt = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
      const reply = rawTxt.replace('[ESCALAR]', '').trim()
      if (reply) await enviarTexto(instance, numero, reply)
    } catch (err) {
      console.error('whatsapp IA:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
