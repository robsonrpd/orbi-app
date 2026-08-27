import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarTexto } from '@/lib/evolution'
import { lerSla, proximoDoRodizio } from '@/lib/atendimento'

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
  const resumo = { alertados: 0, transferidos: 0 }

  const { data: empresas } = await service.from('companies').select('id, settings')

  for (const empresa of empresas ?? []) {
    const sla = lerSla(empresa.settings)
    if (!sla.ativo) continue

    const instance = (empresa.settings as { wa_instance?: string } | null)?.wa_instance
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
          const { data: abertos } = await service.from('contacts')
            .select('responsavel_id').eq('company_id', empresa.id).not('responsavel_id', 'is', null)
          const carga = new Map<string, number>()
          for (const c of abertos ?? []) {
            const id = (c as { responsavel_id: string }).responsavel_id
            carga.set(id, (carga.get(id) ?? 0) + 1)
          }

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

/** Aviso interno para a equipe. Falha aqui não pode derrubar a rotina inteira. */
async function avisar(instance: string, telefone: string, texto: string) {
  const d = (telefone || '').replace(/\D/g, '')
  if (!d) return
  try {
    await enviarTexto(instance, d.startsWith('55') ? d : `55${d}`, texto)
  } catch (err) { console.error('[sla aviso]', err) }
}
