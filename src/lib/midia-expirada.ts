import { createServiceClient } from '@/lib/supabase/server'

type Service = ReturnType<typeof createServiceClient>

/** Quantos dias a foto/áudio/vídeo de uma conversa fica guardado. O TEXTO da mensagem não expira nunca. */
export const DIAS_DE_VALIDADE_DA_MIDIA = 180

/**
 * Faz uma rodada de expiração de mídia antiga (a regra está em supabase/expirar-midia.sql).
 * Ordem deliberada: primeiro o banco marca as mensagens ("mídia expirada"), depois o arquivo é apagado do Storage.
 * Se apagar o arquivo falhar, sobra um arquivo sem uso (inofensivo, recolhido por scripts/limpar-midia-orfa.mjs);
 * o contrário deixaria uma mensagem com imagem quebrada.
 * Nunca lança erro: é faxina e não pode derrubar a rotina que a chama.
 */
export async function expirarMidiaAntiga(service: Service): Promise<{ expiradas: number; falhas: number }> {
  try {
    const { data, error } = await service.rpc('expirar_midia', { p_dias: DIAS_DE_VALIDADE_DA_MIDIA, p_lote: 300 })
    if (error) { console.error('[expirar midia]', error.message); return { expiradas: 0, falhas: 0 } }

    const caminhos = ((data ?? []) as { caminho: string }[]).map(r => r.caminho).filter(Boolean)
    let falhas = 0
    for (let i = 0; i < caminhos.length; i += 100) {
      const { error: e } = await service.storage.from('fotos').remove(caminhos.slice(i, i + 100))
      if (e) { falhas += Math.min(100, caminhos.length - i); console.error('[expirar midia] remoção falhou:', e.message) }
    }
    if (caminhos.length > 0) console.log(`[expirar midia] ${caminhos.length} arquivo(s), ${falhas} falha(s)`)
    return { expiradas: caminhos.length - falhas, falhas }
  } catch (err) {
    console.error('[expirar midia]', err)
    return { expiradas: 0, falhas: 0 }
  }
}
