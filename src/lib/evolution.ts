// Wrapper da Evolution API (v2). Cada empresa = 1 "instância" (1 número de WhatsApp).
// Requer EVOLUTION_API_URL e EVOLUTION_API_KEY no ambiente.

const BASE = () => (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const KEY = () => process.env.EVOLUTION_API_KEY ?? ''

export function evolutionConfigurado() {
  return !!BASE() && !!KEY()
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', apikey: KEY(), ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  const text = await res.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}

/** Cria a instância (se não existir) e já configura o webhook. Retorna o QR code (base64). */
export async function criarInstancia(instance: string, webhookUrl: string) {
  // tenta criar; se já existir, o connect retorna o QR
  const created = await call('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: instance,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ['MESSAGES_UPSERT', 'QRCODE_UPDATED', 'CONNECTION_UPDATE'],
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
        base64: true,
        events: ['MESSAGES_UPSERT', 'QRCODE_UPDATED', 'CONNECTION_UPDATE'],
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

/** Estado da conexão: 'open' = conectado, 'connecting' = aguardando QR, 'close' = desconectado. */
export async function statusInstancia(instance: string) {
  const r = await call(`/instance/connectionState/${instance}`)
  const d = r.data as { instance?: { state?: string }; state?: string } | null
  const state = d?.instance?.state ?? d?.state ?? 'close'
  return { ok: r.ok, state }
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

/** Envia uma mensagem de texto. number = só dígitos com DDI (ex: 5585999999999). */
export async function enviarTexto(instance: string, number: string, text: string) {
  return call(`/message/sendText/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, text }),
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

/** Busca a URL da foto de perfil do WhatsApp de um número. Retorna null se não tiver foto ou o número não existir. */
export async function buscarFotoPerfil(instance: string, number: string) {
  const r = await call(`/chat/fetchProfilePictureUrl/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number }),
  })
  const d = r.data as { profilePictureUrl?: string; picture?: string } | null
  return r.ok ? (d?.profilePictureUrl ?? d?.picture ?? null) : null
}
