'use client'

import { useState, useEffect, useRef } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { conectarWhatsApp, renovarQR, obterQR, desconectarWhatsApp } from '@/lib/actions/whatsapp'
import { MessageCircle, Loader2, CheckCircle2, RefreshCw, Power, QrCode, AlertTriangle } from 'lucide-react'

type Estado = 'idle' | 'loading' | 'qr' | 'connecting' | 'open' | 'nao_configurado' | 'erro'

export function WhatsappConnect({ stateInicial }: { stateInicial: 'open' | 'connecting' | 'close' | 'nao_configurado' }) {
  const [estado, setEstado] = useState<Estado>(stateInicial === 'open' ? 'open' : stateInicial === 'nao_configurado' ? 'nao_configurado' : 'idle')
  const [qr, setQr] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [createDbg, setCreateDbg] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function pararPoll() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  // enquanto aguarda/mostra QR, busca o QR (vindo via webhook) + status a cada 2.5s
  useEffect(() => {
    if (estado === 'qr' || estado === 'connecting') {
      pollRef.current = setInterval(async () => {
        const s = await obterQR()
        if (s.state === 'open') { setEstado('open'); setQr(null); pararPoll(); return }
        if (s.qr) { setQr(s.qr); setEstado('qr'); setErro(null) }
        else if (s.debug) setErro(`connect: ${s.debug}`)
      }, 2500)
      return pararPoll
    }
  }, [estado])

  useEffect(() => pararPoll, [])

  async function conectar() {
    setEstado('loading'); setErro(null); setQr(null)
    const r = await conectarWhatsApp()
    if (r?.error) { setErro(r.error); setEstado('erro'); return }
    if (r?.conectado) { setEstado('open'); return }
    if (r?.qr) { setQr(r.qr); setEstado('qr'); return }
    // QR ainda não veio — mostra a resposta da criação e aguarda o webhook
    setCreateDbg((r as { createDebug?: string })?.createDebug ?? null)
    setEstado('connecting')
  }

  async function novoQR() {
    setEstado('loading')
    await renovarQR()
    setEstado('connecting')
  }

  async function desconectar() {
    setEstado('loading')
    await desconectarWhatsApp()
    setQr(null); setEstado('idle')
  }

  const qrSrc = qr ? (qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`) : null

  return (
    <GlowCard>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="size-4 text-[#0DB57A]" strokeWidth={1.5} />
          <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>WhatsApp da loja</h2>
        </div>

        {estado === 'nao_configurado' && (
          <div className="rounded-xl bg-[#FEF3C7]/50 border border-[#F59E0B]/30 p-4 flex items-start gap-2">
            <AlertTriangle className="size-4 text-[#F59E0B] mt-0.5 shrink-0" />
            <p className="text-sm text-[#8C6A1A]">O canal de WhatsApp ainda não foi configurado no servidor. (Faltam as variáveis EVOLUTION_API_URL e EVOLUTION_API_KEY.)</p>
          </div>
        )}

        {estado === 'open' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-[#E6F9F3] border border-[#0DB57A]/20 p-4">
              <CheckCircle2 className="size-5 text-[#0DB57A]" />
              <div>
                <p className="text-sm font-bold text-[#0DB57A]">WhatsApp conectado!</p>
                <p className="text-xs text-[#8C8880]">A IA já responde os clientes automaticamente.</p>
              </div>
            </div>
            <button onClick={desconectar} className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:underline">
              <Power className="size-4" /> Desconectar
            </button>
          </div>
        )}

        {(estado === 'idle' || estado === 'erro') && (
          <div className="space-y-3">
            <p className="text-sm text-[#8C8880]">Conecte o WhatsApp da sua loja pra IA atender os clientes 24h.</p>
            {erro && <p className="text-xs text-red-500">{erro}</p>}
            <button onClick={conectar}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: '#0DB57A', boxShadow: '0 4px 16px rgba(13,181,122,0.35)' }}>
              <QrCode className="size-4" /> Conectar WhatsApp
            </button>
          </div>
        )}

        {estado === 'loading' && (
          <div className="flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin text-[#0DB57A]" /></div>
        )}

        {estado === 'connecting' && !qr && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="size-6 animate-spin text-[#0DB57A]" />
            <p className="text-sm text-[#8C8880]">Gerando QR Code… aguarde alguns segundos</p>
            {createDbg && <p className="text-[11px] text-blue-400 text-center max-w-md break-all px-4">{createDbg}</p>}
            {erro && <p className="text-[11px] text-red-400 text-center max-w-md break-all px-4">{erro}</p>}
          </div>
        )}

        {estado === 'qr' && qrSrc && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-[#8C8880] text-center">Abra o <strong>WhatsApp → Aparelhos conectados → Conectar aparelho</strong> e aponte pro QR:</p>
            <img src={qrSrc} alt="QR Code WhatsApp" className="w-56 h-56 rounded-xl border border-[#EAE8E1]" />
            <div className="flex items-center gap-2 text-xs text-[#8C8880]">
              <Loader2 className="size-3.5 animate-spin" /> Aguardando leitura…
              <button onClick={novoQR} className="flex items-center gap-1 text-[#1A56FF] font-semibold ml-2"><RefreshCw className="size-3" /> Novo QR</button>
            </div>
          </div>
        )}
      </div>
    </GlowCard>
  )
}
