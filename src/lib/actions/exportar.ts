'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { getModo } from '@/lib/auth/modo'
import { buscarTodos } from '@/lib/supabase/paginacao'

// Exportação das conversas (planilha ou texto no formato do WhatsApp).
//
// O arquivo é montado NO NAVEGADOR, a partir de lotes pequenos devolvidos aqui: uma loja com milhares de conversas
// passaria do limite de ~4,5 MB de resposta da Vercel se o arquivo inteiro saísse de uma vez. Cada lote traz a
// conversa COMPLETA (as 40 recentes + o arquivo de mensagens antigas), em ordem de hora e sem repetir mensagem.
// Só o dono exporta: vendedor (login próprio ou "operando como vendedor") não leva a base de clientes embora.

const POR_LOTE = 40

type MsgBruta = {
  role?: string; content?: string; ts?: string; waId?: string; apagada?: boolean
  midia?: { tipo?: string; url?: string; nome?: string }; midiaExpirada?: boolean
}

export type MensagemExportada = { ts: string; quem: 'cliente' | 'loja' | 'ia'; texto: string; tipo: string; link?: string }
export type ConversaExportada = { nome: string; numero: string; grupo: boolean; mensagens: MensagemExportada[] }

export async function exportarConversasLote(p: {
  desde?: string | null; ate?: string | null; incluirGrupos?: boolean; conversaId?: string | null; inicio?: number
}): Promise<{ error?: string; conversas?: ConversaExportada[]; proximo?: number | null; total?: number }> {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const modo = await getModo()
  if (modo.funcionario) return { error: 'Só o dono da loja pode exportar as conversas.' }

  const service = createServiceClient()
  const inicio = Math.max(0, p.inicio ?? 0)
  let q = service.from('conversations')
    .select('id, numero, contact_id, grupo_nome, messages', { count: 'exact' })
    .eq('company_id', companyId)
  if (p.conversaId) q = q.eq('id', p.conversaId)
  else {
    if (p.desde) q = q.gte('last_message_at', p.desde)
    if (!p.incluirGrupos) q = q.not('numero', 'like', '%@g.us')
  }
  const { data, count, error } = await q.order('last_message_at', { ascending: false, nullsFirst: false }).range(inicio, inicio + POR_LOTE - 1)
  if (error) return { error: 'Não foi possível ler as conversas.' }
  const convs = (data ?? []) as { id: string; numero: string; contact_id: string | null; grupo_nome: string | null; messages: MsgBruta[] | null }[]

  // nomes dos contatos
  const idsContato = [...new Set(convs.map(c => c.contact_id).filter(Boolean))] as string[]
  const nomes = new Map<string, string>()
  if (idsContato.length) {
    const { data: cs } = await service.from('contacts').select('id, name').in('id', idsContato)
    for (const c of (cs ?? []) as { id: string; name: string | null }[]) if (c.name) nomes.set(c.id, c.name)
  }

  // mensagens antigas (arquivo) destas conversas
  const ids = convs.map(c => c.id)
  const arquivo = ids.length ? await buscarTodos<{ conversation_id: string; msg: MsgBruta }>(
    (de, ate) => service.from('mensagens_arquivo').select('conversation_id, msg').eq('company_id', companyId).in('conversation_id', ids).order('id').range(de, ate) as never,
    'exportar arquivo',
  ) : []
  const antigasPor = new Map<string, MsgBruta[]>()
  for (const a of arquivo) { const l = antigasPor.get(a.conversation_id) ?? []; l.push(a.msg); antigasPor.set(a.conversation_id, l) }

  const desde = p.desde ? new Date(p.desde).getTime() : null
  const ate = p.ate ? new Date(p.ate).getTime() : null
  const conversas: ConversaExportada[] = convs.map(c => {
    const vistas = new Set<string>()
    const todas = [...(antigasPor.get(c.id) ?? []), ...(c.messages ?? [])].filter(m => {
      const chave = m.waId || `${m.role}|${m.ts}|${m.content}`
      if (vistas.has(chave)) return false
      vistas.add(chave)
      const t = m.ts ? new Date(m.ts).getTime() : NaN
      if (isNaN(t)) return false
      if (desde !== null && t < desde) return false
      if (ate !== null && t > ate) return false
      return true
    }).sort((a, b) => (a.ts ?? '').localeCompare(b.ts ?? ''))
    const grupo = c.numero.endsWith('@g.us')
    return {
      nome: (grupo ? c.grupo_nome : c.contact_id ? nomes.get(c.contact_id) : null) ?? (grupo ? 'Grupo' : c.numero),
      numero: c.numero,
      grupo,
      mensagens: todas.map(m => ({
        ts: m.ts!,
        quem: m.role === 'user' ? 'cliente' as const : m.role === 'assistant' ? 'ia' as const : 'loja' as const,
        texto: m.apagada ? 'Mensagem apagada' : (m.content ?? ''),
        tipo: m.apagada ? 'apagada' : m.midia?.tipo ?? (m.midiaExpirada ? 'midia expirada' : 'texto'),
        ...(m.midia?.url && !m.apagada ? { link: m.midia.url } : {}),
      })),
    }
  }).filter(c => c.mensagens.length > 0)

  const total = count ?? convs.length
  const proximo = inicio + POR_LOTE < total ? inicio + POR_LOTE : null
  return { conversas, proximo, total }
}
