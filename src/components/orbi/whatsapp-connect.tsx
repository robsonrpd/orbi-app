'use client'

import { useState, useEffect, useRef } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { conectarWhatsApp, renovarQR, obterQR, desconectarWhatsApp, reconectarImportandoHistorico, obterHistoricoImportado, type HistoricoImportado } from '@/lib/actions/whatsapp'
import { MessageCircle, Loader2, CheckCircle2, RefreshCw, Power, QrCode, AlertTriangle, History, X } from 'lucide-react'

type Estado = 'idle' | 'loading' | 'qr' | 'connecting' | 'open' | 'nao_configurado' | 'erro'

export function WhatsappConnect({ stateInicial }: { stateInicial: 'open' | 'connecting' | 'close' | 'nao_configurado' }) {
  const [estado, setEstado] = useState<Estado>(stateInicial === 'open' ? 'open' : stateInicial === 'nao_configurado' ? 'nao_configurado' : 'idle')
  const [qr, setQr] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function pararPoll() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  // enquanto aguarda/mostra QR, busca o QR (vindo via webhook) + status a cada 2.5s
  useEffect(() => {
    if (estado === 'qr' || estado === 'connecting') {
      pollRef.current = setInterval(async () => {
        const s = await obterQR()
        if (s.state === 'open') { setEstado('open'); setQr(null); pararPoll(); return }
        if (s.qr) { setQr(s.qr); setEstado('qr'); setErro(null) }
        else if (s.debug) setErro(s.debug)
      }, 2500)
      return pararPoll
    }
  }, [estado])

  useEffect(() => pararPoll, [])

  // andamento da importação do histórico (só faz sentido com o WhatsApp conectado)
  const [historico, setHistorico] = useState<HistoricoImportado | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  useEffect(() => {
    if (estado !== 'open') return
    let vivo = true
    const buscar = () => obterHistoricoImportado().then(h => { if (vivo) setHistorico(h) })
    buscar()
    // enquanto a importação é recente o número vai subindo; depois de um tempo basta olhar uma vez
    const t = setInterval(() => {
      const recente = historico?.pedidoEm && Date.now() - new Date(historico.pedidoEm).getTime() < 20 * 60_000
      if (recente) buscar()
    }, 10_000)
    return () => { vivo = false; clearInterval(t) }
  }, [estado, historico?.pedidoEm])

  async function reconectarComHistorico() {
    setConfirmando(false)
    setEstado('loading'); setErro(null); setQr(null)
    const r = await reconectarImportandoHistorico()
    if (r?.error) { setErro(r.error); setEstado('erro'); return }
    if (r?.qr) { setQr(r.qr); setEstado('qr'); return }
    setEstado('connecting') // o QR chega pelo webhook (polling)
  }

  async function conectar() {
    setEstado('loading'); setErro(null); setQr(null)
    const r = await conectarWhatsApp()
    if (r?.error) { setErro(r.error); setEstado('erro'); return }
    if (r?.conectado) { setEstado('open'); return }
    if (r?.qr) { setQr(r.qr); setEstado('qr'); return }
    // QR ainda não veio — aguarda chegar pelo webhook (polling)
    setEstado('connecting')
  }

  async function novoQR() {
    setEstado('loading'); setErro(null)
    const r = await renovarQR()
    // sem isto, uma falha aqui caía direto em "Gerando QR Code…" e girava pra sempre
    if (r?.error) { setErro(r.error); setEstado('erro'); return }
    if (r?.conectado) { setEstado('open'); setQr(null); return }
    if (r?.qr) { setQr(r.qr); setEstado('qr'); return }
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
                <p className="text-xs text-[#8C8880]">As mensagens já aparecem em Conversas e no CRM.</p>
              </div>
            </div>
            {historico?.pedidoEm && (() => {
              const minutos = (Date.now() - new Date(historico.pedidoEm).getTime()) / 60_000
              if (historico.mensagens > 0) return (
                <p className="text-xs text-[#2E2D29] flex items-start gap-1.5">
                  <History className="size-3.5 mt-0.5 text-[#1A56FF] shrink-0" />
                  <span>Histórico importado: <strong>{historico.mensagens.toLocaleString('pt-BR')}</strong> mensagens em <strong>{historico.conversas.toLocaleString('pt-BR')}</strong> conversas
                    {historico.leads > 0 ? <>, com <strong>{historico.leads.toLocaleString('pt-BR')}</strong> leads novos</> : null}.
                    {minutos < 20 ? ' Ainda pode estar chegando…' : ''}</span>
                </p>
              )
              if (minutos < 15) return (
                <p className="text-xs text-[#8C8880] flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> Aguardando o WhatsApp enviar o histórico das conversas… pode levar alguns minutos.</p>
              )
              return <p className="text-xs text-[#8C8880]">Nenhum histórico antigo foi recebido nesta conexão.</p>
            })()}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <button onClick={() => setConfirmando(true)} className="flex items-center gap-2 text-sm font-semibold text-[#1A56FF] hover:underline">
                <History className="size-4" /> Reconectar e importar histórico
              </button>
              <button onClick={desconectar} className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:underline">
                <Power className="size-4" /> Desconectar
              </button>
            </div>
          </div>
        )}

        {confirmando && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(6px)' }}>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Reconectar e importar o histórico</p>
                <button onClick={() => setConfirmando(false)} aria-label="Fechar"><X className="size-4 text-[#8C8880]" /></button>
              </div>
              <p className="text-sm text-[#2E2D29] mb-3">O WhatsApp só entrega o histórico antigo das conversas <strong>quando o aparelho é conectado</strong>. Por isso é preciso conectar de novo.</p>
              <ul className="text-sm text-[#2E2D29] space-y-2 mb-4 list-disc pl-5">
                <li><strong>Tenha o celular da loja em mãos.</strong> Vai aparecer um QR Code novo para escanear.</li>
                <li>Enquanto o QR não for escaneado, <strong>as mensagens novas não entram no Orbi</strong> (no celular tudo continua normal).</li>
                <li>Seus leads, conversas e anotações continuam. As mensagens antigas que faltarem são completadas, <strong>sem duplicar</strong>.</li>
                <li>Por segurança, só quem escreveu nos <strong>últimos 90 dias</strong> vira lead novo. Grupos não são importados.</li>
              </ul>
              <div className="flex gap-3">
                <button onClick={() => setConfirmando(false)} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
                <button onClick={reconectarComHistorico} className="flex-1 h-11 rounded-xl text-sm font-bold text-white" style={{ background: '#1A56FF' }}>Desconectar e gerar QR</button>
              </div>
            </div>
          </div>
        )}

        {(estado === 'idle' || estado === 'erro') && (
          <div className="space-y-3">
            <p className="text-sm text-[#8C8880]">Conecte o WhatsApp da sua loja pra receber as mensagens dos clientes direto no Conversas e no CRM.</p>
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
            {erro && <p className="text-[11px] text-red-400">{erro}</p>}
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
