'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { baixarMidiaPendente } from '@/lib/actions/conversas'

export type MidiaBaixada = { tipo: string; url: string; nome?: string }

const ROTULO: Record<string, string> = { image: 'foto', video: 'vídeo', audio: 'áudio', document: 'arquivo' }

/** Botão "Baixar" de foto/áudio/documento do histórico importado (o arquivo só é buscado no WhatsApp quando pedido). */
export function BotaoMidiaPendente({ conversaId, waId, tipo, onBaixada }: {
  conversaId: string; waId: string; tipo: string; onBaixada: (midia: MidiaBaixada) => void
}) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function baixar() {
    setBaixando(true); setErro(null)
    const r = await baixarMidiaPendente(conversaId, waId)
    setBaixando(false)
    if ('error' in r && r.error) { setErro(r.error); return }
    if ('midia' in r && r.midia) onBaixada(r.midia)
  }

  return (
    <div className="mb-1">
      <button onClick={baixar} disabled={baixando}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56FF] bg-white/80 border border-[#D6E0FF] rounded-lg px-2.5 py-1.5 disabled:opacity-60">
        {baixando ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
        Baixar {ROTULO[tipo] ?? 'arquivo'}
      </button>
      {erro && <p className="text-[11px] text-red-600 mt-1 leading-snug">{erro}</p>}
    </div>
  )
}
