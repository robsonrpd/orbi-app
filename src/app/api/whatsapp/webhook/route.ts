import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/claude/buildSystemPrompt'
import { enviarTexto } from '@/lib/evolution'

// Evolution chama este endpoint a cada mensagem recebida (evento MESSAGES_UPSERT).
export async function POST(req: NextRequest) {
  // verificação opcional por token (?token=...)
  const expected = process.env.EVOLUTION_WEBHOOK_TOKEN
  if (expected && req.nextUrl.searchParams.get('token') !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const instance = (body.instance as string) || ''
  const raw = body.data
  const eventos = Array.isArray(raw) ? raw : raw ? [raw] : []
  if (!instance || eventos.length === 0) return NextResponse.json({ ok: true })

  // identifica a empresa pela instância (= slug)
  const service = createServiceClient()
  const { data: company } = await service
    .from('companies')
    .select('name, ai_name, ai_context, business_type, slug, settings')
    .eq('slug', instance).single()
  if (!company) return NextResponse.json({ ok: true })

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
