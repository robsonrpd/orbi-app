import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarTexto } from '@/lib/evolution'

export const maxDuration = 55

type Broadcast = {
  id: string; company_id: string; mensagem: string
  intervalo_segundos: number; limite_diario: number
  enviados_hoje: number; ultima_data_envio: string | null
}
type Destinatario = { id: string; numero: string; nome: string | null }

const ORCAMENTO_MS = 48_000

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const inicio = Date.now()
  const hoje = new Date().toISOString().split('T')[0]

  const { data: ativos } = await service.from('broadcasts' as never).select('*').eq('status', 'ativo')
  let totalEnviados = 0

  for (const raw of (ativos ?? []) as Broadcast[]) {
    if (Date.now() - inicio > ORCAMENTO_MS) break

    let enviadosHoje = raw.enviados_hoje
    if (raw.ultima_data_envio !== hoje) {
      enviadosHoje = 0
      await service.from('broadcasts' as never).update({ enviados_hoje: 0, ultima_data_envio: hoje } as never).eq('id', raw.id)
    }

    const { data: comp } = await service.from('companies').select('settings').eq('id', raw.company_id).single()
    const instance = (comp?.settings as { wa_instance?: string } | null)?.wa_instance
    if (!instance) {
      await service.from('broadcasts' as never).update({ status: 'pausado', erro: 'WhatsApp desconectado' } as never).eq('id', raw.id)
      continue
    }

    while (Date.now() - inicio < ORCAMENTO_MS) {
      if (enviadosHoje >= raw.limite_diario) break // limite diário — tenta de novo no próximo dia

      const { data: prox } = await service.from('broadcast_destinatarios' as never)
        .select('id, numero, nome').eq('broadcast_id', raw.id).eq('status', 'pendente')
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (!prox) {
        await service.from('broadcasts' as never).update({ status: 'concluido' } as never).eq('id', raw.id)
        break
      }
      const dest = prox as Destinatario
      const texto = raw.mensagem.replaceAll('{{nome}}', dest.nome || '')
      const r = await enviarTexto(instance, dest.numero, texto)
      enviadosHoje++
      totalEnviados++
      await service.from('broadcast_destinatarios' as never).update({
        status: r.ok ? 'enviado' : 'falhou', enviado_em: new Date().toISOString(),
      } as never).eq('id', dest.id)
      await service.from('broadcasts' as never).update({ enviados_hoje: enviadosHoje } as never).eq('id', raw.id)

      const restante = ORCAMENTO_MS - (Date.now() - inicio)
      const espera = raw.intervalo_segundos * 1000
      if (espera >= restante) break // não dá tempo de esperar e mandar outra nesse tick
      await new Promise(res => setTimeout(res, espera))
    }
  }

  return NextResponse.json({ ok: true, enviados: totalEnviados })
}
