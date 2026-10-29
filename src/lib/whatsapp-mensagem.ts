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
