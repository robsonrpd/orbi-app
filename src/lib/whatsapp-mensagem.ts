// Leitura do conteúdo de uma mensagem do WhatsApp (formato do Baileys/Evolution).
// Usada tanto pelas mensagens ao vivo quanto pela importação do histórico, pra as duas lerem igual.

type Obj = Record<string, unknown>

/**
 * Mensagens de conversas com "mensagens temporárias" e as de "visualização única" chegam EMBRULHADAS:
 * o texto fica dentro de `ephemeralMessage.message...`, não em `conversation`. O Evolution não desembrulha
 * (só trata `documentWithCaptionMessage`), então sem isto o Orbi não achava texto nenhum e DESCARTAVA a
 * mensagem em silêncio — o cliente escrevia e ela nunca aparecia.
 */
const EMBRULHOS = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage']

export function desembrulhar(msg: unknown): Obj {
  let m = (msg && typeof msg === 'object' ? msg : {}) as Obj
  for (let i = 0; i < 6; i++) {
    let dentro: Obj | null = null
    for (const k of EMBRULHOS) {
      const v = (m[k] as { message?: Obj } | undefined)?.message
      if (v && typeof v === 'object') { dentro = v; break }
    }
    if (!dentro) break
    m = dentro
  }
  return m
}

export type MidiaTipo = 'image' | 'video' | 'audio' | 'document'

export type ConteudoMensagem = {
  /** texto a guardar (texto, legenda ou rótulo do tipo de mídia); null = mensagem sem nada a mostrar (reação, edição...) */
  conteudo: string | null
  midiaTipo: MidiaTipo | null
  docNome?: string
}

const txt = (v: unknown) => (typeof v === 'string' ? v : '')

export function extrairConteudo(msgBruta: unknown): ConteudoMensagem {
  const m = desembrulhar(msgBruta)
  const o = (k: string) => (m[k] ?? null) as Obj | null

  const legenda = txt(o('imageMessage')?.caption) || txt(o('videoMessage')?.caption) || txt(o('documentMessage')?.caption)
  const texto =
    txt(m.conversation)
    || txt(o('extendedTextMessage')?.text)
    || legenda
    // respostas a botões e listas (o cliente tocou numa opção)
    || txt(o('buttonsResponseMessage')?.selectedDisplayText)
    || txt(o('listResponseMessage')?.title)
    || txt(o('templateButtonReplyMessage')?.selectedDisplayText)

  const docNome = txt(o('documentMessage')?.fileName) || undefined
  const midiaTipo: MidiaTipo | null =
    m.imageMessage ? 'image'
    : (m.videoMessage || m.ptvMessage) ? 'video'
    : (m.audioMessage || m.pttMessage) ? 'audio'
    : m.documentMessage ? 'document'
    : null

  const enquete = txt(o('pollCreationMessage')?.name) || txt(o('pollCreationMessageV3')?.name)
  const rotulo =
    midiaTipo === 'image' ? '📷 Imagem'
    : midiaTipo === 'video' ? '🎥 Vídeo'
    : midiaTipo === 'audio' ? '🎤 Áudio'
    : midiaTipo === 'document' ? `📎 ${docNome || 'Documento'}`
    : m.stickerMessage ? '😀 Figurinha'
    : (m.locationMessage || m.liveLocationMessage) ? '📍 Localização'
    : (m.contactMessage || m.contactsArrayMessage) ? '👤 Contato'
    : enquete ? `📊 ${enquete}`
    : (m.productMessage || m.orderMessage) ? '🛍️ Produto'
    : null

  return { conteudo: texto.trim() || rotulo, midiaTipo, docNome }
}

/**
 * Anúncio (Facebook/Instagram "clique para o WhatsApp") que trouxe o cliente.
 * O WhatsApp Web mostra um cartão com o anúncio na 1ª mensagem; ele vem em `contextInfo.externalAdReply`.
 * Para mensagem de texto simples o Evolution coloca o contextInfo NO NÍVEL DO EVENTO (data.contextInfo), para as
 * demais dentro do tipo da mensagem — por isso procuramos nos dois lugares.
 */
export type Anuncio = {
  titulo?: string
  corpo?: string
  /** link curto do anúncio (o que o WhatsApp Web abre) */
  link?: string
  /** publicação no Facebook/Instagram */
  post?: string
  /** miniatura (hospedada por nós; o link do Facebook vence) */
  imagem?: string
  /** id do anúncio na Meta (sourceId) */
  id?: string
  app?: string
}

export function extrairAnuncio(ev: unknown): (Anuncio & { miniaturaBase64?: string }) | null {
  const e = (ev && typeof ev === 'object' ? ev : {}) as Obj
  const m = desembrulhar(e.message)
  const candidatos: Obj[] = []
  if (e.contextInfo && typeof e.contextInfo === 'object') candidatos.push(e.contextInfo as Obj)
  for (const v of Object.values(m)) {
    const ci = (v as { contextInfo?: unknown } | null)?.contextInfo
    if (ci && typeof ci === 'object') candidatos.push(ci as Obj)
  }
  for (const ci of candidatos) {
    const ad = ci.externalAdReply as Obj | undefined
    if (!ad || typeof ad !== 'object') continue
    // externalAdReply também aparece em outros usos; só é anúncio se tiver cara de anúncio
    const ehAnuncio = txt(ad.sourceType) === 'ad' || !!txt(ad.sourceId) || !!txt(ad.ctwaClid) || !!txt(ci.entryPointConversionSource)
    if (!ehAnuncio) continue
    const titulo = txt(ad.title).trim() || undefined
    const corpo = txt(ad.body).trim() || undefined
    const link = txt(ad.sourceUrl).trim() || undefined
    const post = txt(ad.mediaUrl).trim() || undefined
    if (!titulo && !corpo && !link && !post) continue
    const appBruto = (txt(ci.entryPointConversionApp) || txt(ad.sourceApp)).toLowerCase()
    const thumb = txt(ad.thumbnail)
    return {
      titulo, corpo: corpo?.slice(0, 400), link, post,
      id: txt(ad.sourceId) || undefined,
      app: appBruto.includes('insta') ? 'instagram' : appBruto.includes('face') ? 'facebook' : undefined,
      imagem: txt(ad.thumbnailUrl) || undefined,
      miniaturaBase64: thumb.length > 100 ? thumb : undefined,
    }
  }
  return null
}
