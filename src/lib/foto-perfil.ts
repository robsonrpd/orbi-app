import { createServiceClient } from '@/lib/supabase/server'
import { buscarFotoPerfil } from '@/lib/evolution'

type Service = ReturnType<typeof createServiceClient>

// O link de foto que o WhatsApp entrega (pps.whatsapp.net) VENCE em ~2 semanas. Guardar o link fazia
// a foto de cada contato sumir sozinha. Aqui a imagem é baixada, reduzida e hospedada no nosso
// Storage, com link permanente. Reduzida porque a foto original pesa ~48 KB e a lista de conversas
// mostra centenas de avatares: 128x128 fica em ~5 KB (a cota gratuita de tráfego é 5 GB por mês).

const LADO = 128
const LIMITE_BAIXAR = 1_500_000   // não baixa imagem absurda
const LIMITE_SEM_REDUZIR = 150_000 // se o redutor falhar, só guarda a original se for pequena

/** Baixa a foto (de uma URL do WhatsApp) e hospeda no Storage. Devolve a URL permanente, ou null. */
export async function hospedarFotoDePerfil(service: Service, companyId: string, contactId: string, origemUrl: string): Promise<string | null> {
  try {
    const r = await fetch(origemUrl, { signal: AbortSignal.timeout(8000) })
    if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) return null
    const original = Buffer.from(await r.arrayBuffer())
    if (original.length === 0 || original.length > LIMITE_BAIXAR) return null

    let bytes: Buffer = original
    try {
      const sharp = (await import('sharp')).default
      bytes = await sharp(original).rotate().resize(LADO, LADO, { fit: 'cover' }).jpeg({ quality: 72 }).toBuffer()
    } catch (err) {
      console.error('[foto] redutor indisponível:', err instanceof Error ? err.message : err)
      if (original.length > LIMITE_SEM_REDUZIR) return null
    }

    const caminho = `${companyId}/perfil/${contactId}.jpg`
    const { error } = await service.storage.from('fotos').upload(caminho, bytes, {
      contentType: 'image/jpeg', upsert: true, cacheControl: '86400',
    })
    if (error) { console.error('[foto] upload:', error.message); return null }
    // ?v= muda a cada gravação: se a pessoa trocar a foto, o navegador não fica com a antiga em cache
    return `${service.storage.from('fotos').getPublicUrl(caminho).data.publicUrl}?v=${Date.now()}`
  } catch (err) {
    console.error('[foto] hospedar:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Número no formato da Evolution: só dígitos, com 55 na frente quando vier sem código do país. */
function numeroEvolution(phone: string): string {
  const d = (phone ?? '').replace(/\D/g, '')
  return d.startsWith('55') || d.length > 11 ? d : `55${d}`
}

export type ResultadoFoto = 'ok' | 'sem-foto' | 'erro'

/**
 * Busca a foto de um contato e a hospeda. SEMPRE registra a tentativa (foto_tentada_em) — é o que
 * impede de martelar o WhatsApp por quem esconde a foto.
 *
 * `urlConhecida`: link do WhatsApp que já temos (migração das fotos antigas). Se ele já venceu,
 * pede um novo à Evolution. Se nem assim há foto, o link morto é APAGADO: o avatar volta a mostrar
 * as iniciais em vez de uma imagem quebrada.
 */
export async function atualizarFotoDoContato(
  service: Service,
  p: { companyId: string; contactId: string; instance: string; phone: string; urlConhecida?: string | null },
): Promise<ResultadoFoto> {
  await service.from('contacts').update({ foto_tentada_em: new Date().toISOString() } as never).eq('id', p.contactId)

  let hospedada: string | null = null
  if (p.urlConhecida) hospedada = await hospedarFotoDePerfil(service, p.companyId, p.contactId, p.urlConhecida)

  if (!hospedada) {
    let nova: string | null = null
    try { nova = await buscarFotoPerfil(p.instance, numeroEvolution(p.phone)) } catch { /* segue como sem foto */ }
    if (nova) hospedada = await hospedarFotoDePerfil(service, p.companyId, p.contactId, nova)
    if (!hospedada && nova === null && !p.urlConhecida) return 'sem-foto'
    if (!hospedada && nova === null && p.urlConhecida) {
      await service.from('contacts').update({ foto_url: null } as never).eq('id', p.contactId)
      return 'sem-foto'
    }
    if (!hospedada) return 'erro'
  }

  await service.from('contacts').update({ foto_url: hospedada } as never).eq('id', p.contactId)
  return 'ok'
}
