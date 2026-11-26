// Wrapper da Evolution API (v2). Cada empresa = 1 "instância" (1 número de WhatsApp).
// Requer EVOLUTION_API_URL e EVOLUTION_API_KEY no ambiente.

const BASE = () => (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const KEY = () => process.env.EVOLUTION_API_KEY ?? ''

export function evolutionConfigurado() {
  return !!BASE() && !!KEY()
}

// timeout duro em toda chamada à Evolution API — sem isso, uma instância lenta/fora do ar pode
// travar a function inteira (ex: o webhook do WhatsApp) até o limite de maxDuration da Vercel,
// derrubando o processamento de mensagens em vez de só falhar rápido essa chamada específica.
async function call(path: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${BASE()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', apikey: KEY(), ...(init?.headers ?? {}) },
      cache: 'no-store',
      signal: controller.signal,
    })
    const text = await res.text()
    let data: unknown = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    return { ok: false, status: 0, data: { error: err instanceof Error ? err.message : 'timeout' } }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Eventos que o Evolution avisa ao Orbi. MESSAGES_UPDATE traz entrega/leitura (tiques) e MESSAGES_SET traz o
 * histórico do pareamento. O webhook trata cada um explicitamente: evento novo aqui exige tratamento lá.
 */
export const EVENTOS_WEBHOOK = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET', 'QRCODE_UPDATED', 'CONNECTION_UPDATE', 'CONTACTS_SET', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE']

/** Cria a instância (se não existir) e já configura o webhook. Retorna o QR code (base64). */
export async function criarInstancia(instance: string, webhookUrl: string) {
  // tenta criar; se já existir, o connect retorna o QR
  const created = await call('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: instance,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      // Pede ao WhatsApp o histórico COMPLETO no pareamento (o padrão é só o recente). É a única hora em que o
      // WhatsApp entrega histórico: depois de pareado não dá mais pra pedir. O Orbi importa o que vier em
      // MESSAGES_SET (src/lib/historico-whatsapp.ts). Sem isto a conversa de um cliente novo começava do zero.
      syncFullHistory: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        // NÃO embutir o arquivo no aviso: foto/PDF grande passava do limite de 4,5 MB da Vercel (erro 413) e o
        // Evolution ficava reenviando o mesmo aviso, travando TODAS as mensagens da loja atrás dele (Ritmo Cordis,
        // 25/11). O webhook busca o arquivo depois, pela API (getMediaBase64).
        base64: false,
        events: EVENTOS_WEBHOOK,
      },
    }),
  })
  // a própria resposta do create já pode trazer o QR
  const cd = created.data as { qrcode?: { base64?: string } | string; base64?: string } | null
  const qrCreate =
    (typeof cd?.qrcode === 'object' ? cd?.qrcode?.base64 : undefined)
    ?? cd?.base64
    ?? (typeof cd?.qrcode === 'string' ? cd.qrcode : undefined)
    ?? null
  return { ok: created.ok, qr: qrCreate, createStatus: created.status, createData: created.data }
}

/** (Re)configura o webhook de uma instância existente. */
export async function setWebhook(instance: string, url: string) {
  return call(`/webhook/set/${instance}`, {
    method: 'POST',
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url,
        byEvents: false,
        // NÃO embutir o arquivo no aviso: foto/PDF grande passava do limite de 4,5 MB da Vercel (erro 413) e o
        // Evolution ficava reenviando o mesmo aviso, travando TODAS as mensagens da loja atrás dele (Ritmo Cordis,
        // 25/11). O webhook busca o arquivo depois, pela API (getMediaBase64).
        base64: false,
        events: EVENTOS_WEBHOOK,
      },
    }),
  })
}

/** Retorna o QR code (base64) para escanear. */
export async function conectar(instance: string) {
  const r = await call(`/instance/connect/${instance}`)
  const d = r.data as { base64?: string; code?: string; qrcode?: { base64?: string } } | null
  const base64 = d?.base64 ?? d?.qrcode?.base64 ?? null
  return { ok: r.ok, qr: base64, raw: d }
}

/**
 * Estado real de TODAS as instâncias numa chamada só: { nome da instância -> estado }.
 * Existe pra quem precisa checar várias empresas de uma vez (ex: o vigia de silêncio):
 * uma chamada por empresa estouraria o tempo limite da rota.
 */
export async function listarInstancias() {
  const r = await call('/instance/fetchInstances')
  const lista = Array.isArray(r.data) ? (r.data as { name?: string; connectionStatus?: string }[]) : []
  const mapa = new Map<string, string>()
  for (const i of lista) if (i.name) mapa.set(i.name, i.connectionStatus ?? 'close')
  return { ok: r.ok && Array.isArray(r.data), estados: mapa }
}

/** Estado da conexão: 'open' = conectado, 'connecting' = aguardando QR, 'close' = desconectado. */
export async function statusInstancia(instance: string) {
  const r = await call(`/instance/connectionState/${instance}`)
  const d = r.data as { instance?: { state?: string }; state?: string; response?: { message?: unknown } } | null
  const state = d?.instance?.state ?? d?.state ?? 'close'
  // 404 COM a mensagem do próprio Evolution = "essa instância não existe" (loja nova que nunca
  // conectou, ou instância já apagada). É uma resposta VÁLIDA, não uma falha do servidor.
  // Um 404 sem essa mensagem (ex: o proxy do Railway com o serviço fora do ar) continua sendo falha.
  const naoExiste = r.status === 404 && /instance does not exist/i.test(JSON.stringify(d?.response?.message ?? ''))
  return { ok: r.ok, state, status: r.status, naoExiste }
}

/** Desconecta (logout) a instância. */
export async function desconectarInstancia(instance: string) {
  return call(`/instance/logout/${instance}`, { method: 'DELETE' })
}

/** Apaga a instância por completo (logout + delete). Usado para recriar do zero. */
export async function deletarInstancia(instance: string) {
  await call(`/instance/logout/${instance}`, { method: 'DELETE' })
  return call(`/instance/delete/${instance}`, { method: 'DELETE' })
}

/** Mensagem citada numa resposta ("Responder" do WhatsApp). */
export type Citacao = { id: string; remoteJid: string; fromMe: boolean; texto: string }

/** Envia uma mensagem de texto. number = só dígitos com DDI (ex: 5585999999999). quoted = responder a uma mensagem. */
export async function enviarTexto(instance: string, number: string, text: string, quoted?: Citacao) {
  return call(`/message/sendText/${instance}`, {
    method: 'POST',
    body: JSON.stringify({
      number, text,
      ...(quoted ? { quoted: { key: { id: quoted.id, remoteJid: quoted.remoteJid, fromMe: quoted.fromMe }, message: { conversation: quoted.texto } } } : {}),
    }),
  })
}

/** Reage a uma mensagem com um emoji (emoji vazio remove a reação). */
export async function enviarReacao(instance: string, key: { id: string; remoteJid: string; fromMe: boolean }, emoji: string) {
  return call(`/message/sendReaction/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ key, reaction: emoji }),
  })
}

/** Envia imagem/documento/vídeo. media = URL pública. mediatype: 'image' | 'document' | 'video'. */
export async function enviarMedia(instance: string, number: string, p: { mediatype: string; media: string; fileName?: string; caption?: string }) {
  return call(`/message/sendMedia/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, mediatype: p.mediatype, media: p.media, fileName: p.fileName, caption: p.caption }),
  })
}

/** Baixa o base64 de uma mensagem de mídia (foto/áudio/vídeo/doc). `message` = objeto da mensagem recebida. */
export async function getMediaBase64(instance: string, message: unknown) {
  const r = await call(`/chat/getBase64FromMediaMessage/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ message, convertToMp4: false }),
  })
  const d = r.data as { base64?: string; mimetype?: string } | null
  return { ok: r.ok, base64: d?.base64 ?? null, mimetype: d?.mimetype ?? null }
}

/** Envia áudio de voz (ptt). audio = URL pública ou base64. */
export async function enviarAudio(instance: string, number: string, audio: string) {
  return call(`/message/sendWhatsAppAudio/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, audio }),
  })
}

/** JID de grupo termina em @g.us — telefone de pessoa, não. */
export function ehGrupo(numero: string | null | undefined) {
  return !!numero && numero.endsWith('@g.us')
}

/**
 * Destinatário no formato que a Evolution espera: grupo vai com o JID inteiro,
 * pessoa vai só com os dígitos do telefone.
 */
export function destinoDe(numero: string) {
  return ehGrupo(numero) ? numero : numero.replace(/\D/g, '')
}

/** Nome (assunto) de um grupo. Buscado uma vez, quando o grupo aparece pela primeira vez. */
export async function buscarNomeGrupo(instance: string, groupJid: string) {
  const r = await call(`/group/findGroupInfos/${instance}?groupJid=${encodeURIComponent(groupJid)}`)
  const d = r.data as { subject?: string } | null
  return r.ok ? (d?.subject ?? null) : null
}

/**
 * Apaga a mensagem no WhatsApp de todo mundo (o "Apagar para todos" do app).
 * Só funciona em mensagens enviadas pela própria loja e dentro do prazo do WhatsApp.
 */
export async function apagarMensagemWhatsApp(instance: string, p: { id: string; remoteJid: string; fromMe: boolean; participant?: string }) {
  return call(`/chat/deleteMessageForEveryone/${instance}`, {
    method: 'DELETE',
    body: JSON.stringify(p),
  })
}

/** Busca a URL da foto de perfil do WhatsApp de um número. Retorna null se não tiver foto ou o número não existir. */
export async function buscarFotoPerfil(instance: string, number: string) {
  const r = await call(`/chat/fetchProfilePictureUrl/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number }),
  })
  const d = r.data as { profilePictureUrl?: string; picture?: string } | null
  return r.ok ? (d?.profilePictureUrl ?? d?.picture ?? null) : null
}

/** Envia um cartão de contato (vCard). telefone = só dígitos com DDI. */
export async function enviarContato(instance: string, number: string, p: { nome: string; telefone: string }) {
  const tel = p.telefone.replace(/\D/g, '')
  return call(`/message/sendContact/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, contact: [{ fullName: p.nome, wuid: tel, phoneNumber: `+${tel}` }] }),
  })
}

/** Envia uma enquete. escolhas = quantas opções a pessoa pode marcar (1 = só uma). */
export async function enviarEnquete(instance: string, number: string, p: { pergunta: string; opcoes: string[]; escolhas: number }) {
  return call(`/message/sendPoll/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, name: p.pergunta, selectableCount: p.escolhas, values: p.opcoes }),
  })
}

/** Envia uma figurinha a partir de uma imagem (URL pública); o Evolution converte para o formato de figurinha. */
export async function enviarFigurinha(instance: string, number: string, sticker: string) {
  return call(`/message/sendSticker/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, sticker }),
  })
}

/** Número do WhatsApp conectado na instância (só dígitos), ou null. */
export async function numeroDaInstancia(instance: string) {
  const r = await call(`/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`)
  const i = (Array.isArray(r.data) ? r.data[0] : r.data) as { ownerJid?: string; number?: string } | null
  const n = (i?.ownerJid ?? i?.number ?? '').split('@')[0].replace(/\D/g, '')
  return n || null
}
