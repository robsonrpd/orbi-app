import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/claude/buildSystemPrompt'

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  // Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'A chave da IA (ANTHROPIC_API_KEY) não está configurada. Adicione nas variáveis de ambiente.' }, { status: 503 })
  }

  const { messages } = await req.json() as { messages: Message[] }
  if (!messages?.length) return NextResponse.json({ error: 'Sem mensagens.' }, { status: 400 })

  // Busca dados da empresa para montar o contexto
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user.id).single()
  const { data: company } = await service
    .from('companies')
    .select('name, ai_name, ai_context, business_type')
    .eq('id', userData?.company_id)
    .single()

  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: buildSystemPrompt(company),
      messages: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const escalou = raw.trimStart().startsWith('[ESCALAR]')
    const texto = raw.replace('[ESCALAR]', '').trim()

    return NextResponse.json({ resposta: texto, escalou })
  } catch (err) {
    console.error('Erro Claude:', err)
    return NextResponse.json({ error: 'Erro ao gerar resposta da IA.' }, { status: 500 })
  }
}
