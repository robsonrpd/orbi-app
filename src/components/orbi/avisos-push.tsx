'use client'

import { useEffect, useState } from 'react'
import { BellRing, BellOff, Loader2, Share } from 'lucide-react'
import { salvarInscricaoPush, removerInscricaoPush, chavePublicaPush } from '@/lib/actions/push'

type Estado = 'carregando' | 'sem-suporte' | 'instalar-iphone' | 'bloqueado' | 'desligado' | 'ligado'

function chaveParaBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

function ehIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}
function instaladoNaTela() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

async function registro() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return reg
}

/**
 * Liga/desliga o aviso de mensagem nova NESTE aparelho (celular ou computador).
 * No iPhone o Safari só permite avisos com o Orbi instalado na Tela de Início — então ensina a instalar.
 * `compacto`: faixa curta para o topo da lista de conversas (some quando já está ligado ou bloqueado).
 */
export function AvisosPush({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>('carregando')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dispensado, setDispensado] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (compacto && localStorage.getItem('orbi_aviso_push_dispensado') === '1') setDispensado(true)
      } catch { /* sem armazenamento local: mostra a faixa */ }
      const temApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      if (!temApi) { if (vivo) setEstado(ehIphone() && !instaladoNaTela() ? 'instalar-iphone' : 'sem-suporte'); return }
      if (Notification.permission === 'denied') { if (vivo) setEstado('bloqueado'); return }
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub && Notification.permission === 'granted') {
        // reenvia a inscrição (a loja ativa pode ter mudado; é idempotente)
        salvarInscricaoPush(sub.toJSON(), navigator.userAgent, false).catch(() => { /* tenta de novo na próxima abertura */ })
        if (vivo) setEstado('ligado')
      } else if (vivo) setEstado('desligado')
    })().catch(() => { if (vivo) setEstado('sem-suporte') })
    return () => { vivo = false }
  }, [compacto])

  async function ligar() {
    setOcupado(true); setErro(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setEstado(perm === 'denied' ? 'bloqueado' : 'desligado'); return }
      const reg = await registro()
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(await chavePublicaPush()) })
      const r = await salvarInscricaoPush(sub.toJSON(), navigator.userAgent)
      if ('error' in r && r.error) { setErro(r.error); return }
      setEstado('ligado')
    } catch (e) {
      setErro('Não foi possível ativar neste aparelho.')
      console.error(e)
    } finally { setOcupado(false) }
  }

  async function desligar() {
    setOcupado(true); setErro(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) { await removerInscricaoPush(sub.endpoint); await sub.unsubscribe() }
      setEstado('desligado')
    } finally { setOcupado(false) }
  }

  if (estado === 'carregando' || estado === 'sem-suporte') return null

  if (compacto) {
    if (dispensado || estado === 'ligado' || estado === 'bloqueado') return null
    const dispensar = () => { setDispensado(true); try { localStorage.setItem('orbi_aviso_push_dispensado', '1') } catch { /* ok */ } }
    return (
      <div className="mx-3 mt-3 rounded-xl border border-[#D6E0FF] bg-[#EEF2FF] px-3 py-2.5 text-xs text-[#1C1B18]">
        {estado === 'instalar-iphone' ? (
          <p className="leading-snug">
            <strong>Receba aviso de mensagem nova:</strong> no Safari, toque em <Share className="inline size-3.5 -mt-0.5" /> Compartilhar →
            <strong> Adicionar à Tela de Início</strong>, abra o Orbi pelo ícone e ative aqui.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-[#1A56FF] shrink-0" />
            <p className="flex-1 leading-snug">Receba aviso no aparelho quando chegar mensagem nova.</p>
            <button onClick={ligar} disabled={ocupado}
              className="shrink-0 h-7 px-3 rounded-lg bg-[#1A56FF] text-white font-bold disabled:opacity-60 flex items-center gap-1">
              {ocupado && <Loader2 className="size-3 animate-spin" />} Ativar
            </button>
          </div>
        )}
        {erro && <p className="mt-1 text-red-600">{erro}</p>}
        <button onClick={dispensar} className="mt-1 text-[11px] text-[#8C8880] underline">Agora não</button>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-b border-[#EAE8E1] bg-[#FAFAF9]">
      {estado === 'instalar-iphone' ? (
        <p className="text-xs text-[#5C5A54] leading-snug">
          <strong className="text-[#1C1B18]">Aviso de mensagem nova no iPhone:</strong> no Safari toque em <Share className="inline size-3.5 -mt-0.5" /> Compartilhar →
          <strong> Adicionar à Tela de Início</strong>. Depois abra o Orbi pelo ícone e ative aqui.
        </p>
      ) : estado === 'bloqueado' ? (
        <p className="text-xs text-[#5C5A54] leading-snug">
          <BellOff className="inline size-3.5 -mt-0.5 mr-1" />Os avisos foram bloqueados neste aparelho. Libere nas configurações do navegador (Notificações → Orbi).
        </p>
      ) : (
        <div className="flex items-center gap-2">
          {estado === 'ligado' ? <BellRing className="size-4 text-[#0DB57A] shrink-0" /> : <BellOff className="size-4 text-[#8C8880] shrink-0" />}
          <p className="flex-1 text-xs text-[#1C1B18] leading-snug">
            {estado === 'ligado' ? 'Aviso de mensagem nova ligado neste aparelho' : 'Receber aviso de mensagem nova neste aparelho'}
          </p>
          <button onClick={estado === 'ligado' ? desligar : ligar} disabled={ocupado}
            className={`shrink-0 h-7 px-3 rounded-lg text-xs font-bold disabled:opacity-60 flex items-center gap-1 ${estado === 'ligado' ? 'bg-white border border-[#EAE8E1] text-[#5C5A54]' : 'bg-[#1A56FF] text-white'}`}>
            {ocupado && <Loader2 className="size-3 animate-spin" />} {estado === 'ligado' ? 'Desligar' : 'Ativar'}
          </button>
        </div>
      )}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  )
}

