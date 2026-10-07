import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { atualizarFotoDoContato } from '@/lib/foto-perfil'

export const maxDuration = 55

/** Contatos por loja a cada rodada. Baixo de propósito: é consulta ao WhatsApp, e pedir centenas de fotos de uma vez chama atenção. */
const POR_LOJA = 8
const ORCAMENTO_MS = 45_000
const PAUSA_MS = 700

/**
 * Rotina de fundo das fotos de perfil. Cobre os dois casos que a captura no webhook não resolve:
 *  - fotos antigas guardadas como LINK do WhatsApp, que vence em ~2 semanas: migra pro Storage antes;
 *  - contatos sem foto (a 1ª tentativa falhou, ou o contato veio da recuperação): tenta de novo, no máx. a cada 3 dias.
 * Chamada pelo agendador do banco a cada 10 minutos, com o CRON_SECRET no header.
 */
export async function POST(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  const service = createServiceClient()
  const inicio = Date.now()
  const { data: empresas } = await service.from('companies').select('id, name, settings')

  // só lojas com WhatsApp conectado agora; ordem sorteada pra uma loja grande não deixar as outras sem vez
  const abertas = (empresas ?? [])
    .filter(e => (e.settings as { wa_instance?: string; wa_state?: string } | null)?.wa_state === 'open')
    .sort(() => Math.random() - 0.5)

  const r = { lojas: 0, hospedadas: 0, semFoto: 0, erro: 0 }
  for (const e of abertas) {
    if (Date.now() - inicio > ORCAMENTO_MS) break
    const instance = (e.settings as { wa_instance?: string }).wa_instance
    if (!instance) continue

    const { data: pendentes, error } = await service.rpc('fotos_pendentes', { p_company: e.id, p_limite: POR_LOJA })
    if (error) { console.error('[cron fotos]', e.name, error.message); continue }
    if (!pendentes?.length) continue
    r.lojas++

    for (const c of pendentes as { id: string; phone: string; foto_url: string | null }[]) {
      if (Date.now() - inicio > ORCAMENTO_MS) break
      const res = await atualizarFotoDoContato(service, {
        companyId: e.id, contactId: c.id, instance, phone: c.phone,
        urlConhecida: c.foto_url?.includes('pps.whatsapp.net') ? c.foto_url : null,
      })
      if (res === 'ok') r.hospedadas++; else if (res === 'sem-foto') r.semFoto++; else r.erro++
      await new Promise(res2 => setTimeout(res2, PAUSA_MS))
    }
  }

  return NextResponse.json({ ok: true, ...r })
}
