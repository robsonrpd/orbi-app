import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarTexto } from '@/lib/evolution'
import {
  lerSla, lerFollowup, proximoDoRodizio, cargaDosVendedores,
  dentroDoHorario, MAX_FOLLOWUPS_POR_RODADA,
} from '@/lib/atendimento'

export const maxDuration = 55

type Msg = { role: string; content: string; ts?: string }

/**
 * Varre conversas em que o cliente falou por último e ninguém respondeu.
 * Passado o tempo de alerta, avisa o vendedor. Passado o de transferência,
 * entrega o lead a outro vendedor — porque lead parado esfria.
 *
 * Chamada por agendador externo (cron-job.org) com o CRON_SECRET no header.
 */
export async function POST(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  const service = createServiceClient()
  const agora = Date.now()
  const resumo = { alertados: 0, transferidos: 0, followups: 0 }

  const { data: empresas } = await service.from('companies').select('id, settings')

  for (const empresa of empresas ?? []) {
    const instanceEmpresa = (empresa.settings as { wa_instance?: string } | null)?.wa_instance

    // follow-up roda antes e é independente do SLA: um cobra o cliente, o outro o vendedor
    try {
      resumo.followups += await processarFollowups(service, empresa, instanceEmpresa, agora)
    } catch (err) { console.error('[cron followup]', err) }

    const sla = lerSla(empresa.settings)
    if (!sla.ativo) continue

    const instance = instanceEmpresa
    const limiteAlerta = new Date(agora - sla.minutosAlerta * 60_000).toISOString()

    const { data: convs } = await service.from('conversations')
      .select('id, numero, contact_id, messages, last_message_at, sla_alertado_em, sla_transferido_em')
      .eq('company_id', empresa.id)
      .lt('last_message_at', limiteAlerta)
      .order('last_message_at', { ascending: false })
      .limit(200)

    for (const conv of convs ?? []) {
      const msgs = (conv.messages as Msg[] | null) ?? []
      const ultima = msgs[msgs.length - 1]
      // só interessa quando quem falou por último foi o CLIENTE — aí a bola está com a loja
      if (!ultima || ultima.role !== 'user') continue
      if (!conv.contact_id) continue

      const paradoMin = (agora - new Date(conv.last_message_at as string).getTime()) / 60_000

      const { data: contato } = await service.from('contacts')
        .select('id, name, phone, responsavel_id').eq('id', conv.contact_id).single()
      if (!contato) continue

      const nomeLead = (contato as { name?: string }).name || (conv.numero as string)

      // 1) transferência: passou do prazo maior e ainda sem resposta
      if (paradoMin >= sla.minutosTransferencia && !conv.sla_transferido_em) {
        const { data: vendedores } = await service.from('vendedores')
          .select('id, nome, telefone').eq('company_id', empresa.id).eq('active', true)

        if (vendedores?.length) {
          const carga = await cargaDosVendedores(service, empresa.id)
          const atual = (contato as { responsavel_id?: string }).responsavel_id ?? null
          const novo = proximoDoRodizio(vendedores as { id: string; nome: string }[], carga, atual)
          if (novo) {
            await service.from('contacts').update({ responsavel_id: novo.id } as never).eq('id', contato.id)
            await service.from('lead_anotacoes').insert({
              company_id: empresa.id, contact_id: contato.id,
              texto: `⚠️ Lead transferido automaticamente para ${novo.nome} — ficou ${Math.round(paradoMin)} min sem resposta.`,
            } as never)
            await service.from('conversations').update({ sla_transferido_em: new Date().toISOString() }).eq('id', conv.id)

            if (sla.avisarWhatsapp && instance) {
              const tel = (vendedores as { id: string; telefone?: string }[]).find(v => v.id === novo.id)?.telefone
              if (tel) {
                await avisar(instance, tel, `🔔 Novo lead pra você: *${nomeLead}*\n\nEle ficou ${Math.round(paradoMin)} min sem resposta e foi transferido automaticamente. Fale com ele o quanto antes.`)
              }
            }
            resumo.transferidos++
          }
        }
        continue
      }

      // 2) alerta: passou do prazo menor, ainda dentro do prazo de transferência
      if (paradoMin >= sla.minutosAlerta && !conv.sla_alertado_em) {
        await service.from('conversations').update({ sla_alertado_em: new Date().toISOString() }).eq('id', conv.id)

        if (sla.avisarWhatsapp && instance) {
          const responsavelId = (contato as { responsavel_id?: string }).responsavel_id
          if (responsavelId) {
            const { data: v } = await service.from('vendedores')
              .select('nome, telefone').eq('id', responsavelId).single()
            const tel = (v as { telefone?: string } | null)?.telefone
            if (tel) {
              await avisar(instance, tel, `⏰ *${nomeLead}* está esperando resposta há ${Math.round(paradoMin)} min.\n\nSe não responder, o lead será passado para outro vendedor.`)
            }
          }
        }
        resumo.alertados++
      }
    }
  }

  return NextResponse.json({ ok: true, ...resumo })
}

/**
 * Cobra o lead que ficou em silêncio depois que a loja falou por último.
 *
 * É o espelho do SLA: lá o cliente esperava a loja, aqui a loja espera o cliente.
 * Como aqui QUEM INICIA é a loja, os freios importam mais — horário comercial,
 * teto por rodada, contador que só avança e parada imediata quando o lead responde.
 */
async function processarFollowups(
  service: ReturnType<typeof createServiceClient>,
  empresa: { id: string; settings: unknown },
  instance: string | undefined,
  agora: number,
): Promise<number> {
  const cfg = lerFollowup(empresa.settings)
  if (!cfg.ativo || cfg.etapas.length === 0 || !instance) return 0
  if (!dentroDoHorario(cfg)) return 0 // fora do horário: espera a próxima passagem

  const menorHoras = Math.min(...cfg.etapas.map(e => e.horas))
  const limite = new Date(agora - menorHoras * 3_600_000).toISOString()

  const { data: convs } = await service.from('conversations')
    .select('id, numero, contact_id, messages, last_message_at, followup_etapa, followup_ultimo_em')
    .eq('company_id', empresa.id)
    .lt('last_message_at', limite)
    .order('last_message_at', { ascending: false })
    .limit(300)

  let enviados = 0
  for (const conv of convs ?? []) {
    if (enviados >= MAX_FOLLOWUPS_POR_RODADA) break

    const msgs = (conv.messages as Msg[] | null) ?? []
    const ultima = msgs[msgs.length - 1]
    // só cobra quem deixou a LOJA falando por último; se o cliente falou, é caso de SLA
    if (!ultima || ultima.role === 'user') continue

    const etapaAtual = (conv.followup_etapa as number | null) ?? 0
    if (etapaAtual >= cfg.etapas.length) continue // já esgotou as cobranças

    // lead fechado ou perdido não recebe cobrança
    if (conv.contact_id) {
      const { data: c } = await service.from('contacts')
        .select('funil_etapa').eq('id', conv.contact_id).single()
      const etapa = (c as { funil_etapa?: string } | null)?.funil_etapa
      if (etapa === 'convertido' || etapa === 'perdido') continue
    }

    const proxima = cfg.etapas[etapaAtual]
    const referencia = new Date((conv.followup_ultimo_em as string | null) ?? (conv.last_message_at as string)).getTime()
    if ((agora - referencia) / 3_600_000 < proxima.horas) continue

    const env = await enviarTexto(instance, (conv.numero as string).replace(/\D/g, ''), proxima.texto)
    if (!env.ok) continue // não avança o contador: tenta de novo na próxima passagem

    const registro: Msg = { role: 'human', content: proxima.texto, ts: new Date().toISOString() }
    await service.from('conversations').update({
      messages: [...msgs, registro].slice(-60),
      followup_etapa: etapaAtual + 1,
      followup_ultimo_em: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    }).eq('id', conv.id)

    enviados++
    await new Promise(r => setTimeout(r, 1500)) // espaça os envios
  }

  return enviados
}

/** Aviso interno para a equipe. Falha aqui não pode derrubar a rotina inteira. */
async function avisar(instance: string, telefone: string, texto: string) {
  const d = (telefone || '').replace(/\D/g, '')
  if (!d) return
  try {
    await enviarTexto(instance, d.startsWith('55') ? d : `55${d}`, texto)
  } catch (err) { console.error('[sla aviso]', err) }
}
