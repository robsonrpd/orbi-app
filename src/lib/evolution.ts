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
  await call('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: instance,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ['MESSAGES_UPSERT'],
      },
    }),
  })
  return conectar(instance)
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

/** Envia uma mensagem de texto. number = só dígitos com DDI (ex: 5585999999999). */
export async function enviarTexto(instance: string, number: string, text: string) {
  return call(`/message/sendText/${instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, text }),
  })
}
