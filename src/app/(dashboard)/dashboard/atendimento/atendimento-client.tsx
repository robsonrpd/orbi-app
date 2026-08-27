'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { salvarFluxo, salvarSla, reiniciarFluxoConversa } from '@/lib/actions/atendimento'
import type { FluxoAtendimento, SlaAtendimento, EtapaFluxo } from '@/lib/atendimento'
import {
  MessageCircle, Clock, Plus, Trash2, ChevronUp, ChevronDown, Check, Loader2,
  AlertTriangle, HelpCircle, Send, RotateCcw, Users,
} from 'lucide-react'

function novaId() { return Math.random().toString(36).slice(2, 9) }

export function AtendimentoClient({ fluxoInicial, slaInicial }: { fluxoInicial: FluxoAtendimento; slaInicial: SlaAtendimento }) {
  const [fluxo, setFluxo] = useState(fluxoInicial)
  const [sla, setSla] = useState(slaInicial)
  const [salvandoF, setSalvandoF] = useState(false)
  const [salvandoS, setSalvandoS] = useState(false)
  const [okF, setOkF] = useState(false)
  const [okS, setOkS] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [telTeste, setTelTeste] = useState('')
  const [reiniciando, setReiniciando] = useState(false)
  const [avisoTeste, setAvisoTeste] = useState<string | null>(null)

  function mudarEtapa(i: number, patch: Partial<EtapaFluxo>) {
    setFluxo(f => ({ ...f, etapas: f.etapas.map((e, idx) => idx === i ? { ...e, ...patch } : e) }))
  }
  function moverEtapa(i: number, dir: -1 | 1) {
    setFluxo(f => {
      const j = i + dir
      if (j < 0 || j >= f.etapas.length) return f
      const novas = [...f.etapas]
      ;[novas[i], novas[j]] = [novas[j], novas[i]]
      return { ...f, etapas: novas }
    })
  }
  function removerEtapa(i: number) {
    setFluxo(f => ({ ...f, etapas: f.etapas.filter((_, idx) => idx !== i) }))
  }
  function adicionar(tipo: 'mensagem' | 'pergunta') {
    setFluxo(f => ({ ...f, etapas: [...f.etapas, { id: novaId(), tipo, texto: '', ...(tipo === 'pergunta' ? { rotulo: '' } : {}) }] }))
  }

  async function guardarFluxo() {
    setSalvandoF(true); setErro(null)
    const r = await salvarFluxo(fluxo)
    setSalvandoF(false)
    if (r?.error) { setErro(r.error); return }
    setOkF(true); setTimeout(() => setOkF(false), 2000)
  }

  async function guardarSla() {
    setSalvandoS(true); setErro(null)
    const r = await salvarSla(sla)
    setSalvandoS(false)
    if (r?.error) { setErro(r.error); return }
    setOkS(true); setTimeout(() => setOkS(false), 2000)
  }

  async function reiniciar() {
    setReiniciando(true); setAvisoTeste(null); setErro(null)
    const r = await reiniciarFluxoConversa(telTeste)
    setReiniciando(false)
    if (r?.error) { setErro(r.error); return }
    setAvisoTeste('Pronto! Mande uma mensagem desse número que o roteiro começa de novo.')
  }

  const input = "w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]"
  const label = "text-xs font-bold text-[#2E2D29] uppercase tracking-wider mb-1.5 block"

  return (
    <div className="space-y-5 max-w-3xl">
      {erro && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{erro}</div>}

      {/* ── Roteiro de primeiro atendimento ── */}
      <GlowCard>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-[#0DB57A]" strokeWidth={1.5} />
              <div>
                <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Primeiro atendimento automático</h2>
                <p className="text-xs text-[#8C8880]">Responde sozinho quem chama pela primeira vez</p>
              </div>
            </div>
            <button onClick={() => setFluxo(f => ({ ...f, ativo: !f.ativo }))}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${fluxo.ativo ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${fluxo.ativo ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="rounded-xl bg-[#EEF2FF] border border-[#1A56FF]/20 p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="size-4 text-[#1A56FF] mt-0.5 shrink-0" />
            <p className="text-xs text-[#1A3A6E] leading-relaxed">
              O roteiro só dispara para quem <strong>mandou mensagem primeiro</strong>, e cada etapa é enviada
              uma única vez por pessoa. São as duas travas que protegem seu número de bloqueio.
            </p>
          </div>

          <div className="space-y-3">
            {fluxo.etapas.map((e, i) => (
              <div key={e.id} className="rounded-xl border border-[#EAE8E1] bg-white p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-lg bg-[#0A0F1E] text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${e.tipo === 'pergunta' ? 'bg-[#FEF3C7] text-[#8C6A1A]' : 'bg-[#E6F9F3] text-[#0DB57A]'}`}>
                    {e.tipo === 'pergunta' ? <><HelpCircle className="size-3" /> Pergunta</> : <><Send className="size-3" /> Mensagem</>}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button onClick={() => moverEtapa(i, -1)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
                    <button onClick={() => moverEtapa(i, 1)} disabled={i === fluxo.etapas.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
                    <button onClick={() => removerEtapa(i)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                <textarea value={e.texto} onChange={ev => mudarEtapa(i, { texto: ev.target.value })} rows={e.tipo === 'pergunta' ? 2 : 3} maxLength={900}
                  placeholder={e.tipo === 'pergunta' ? 'Ex: Qual produto você tem interesse?' : 'Ex: Olá! Bem-vindo à nossa loja...'}
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] resize-y placeholder:text-[#C8C5BB]" />
                {e.tipo === 'pergunta' && (
                  <div className="mt-2">
                    <input value={e.rotulo ?? ''} onChange={ev => mudarEtapa(i, { rotulo: ev.target.value })} maxLength={40}
                      placeholder="Como salvar a resposta no lead (ex: Produto de interesse)"
                      className="w-full h-9 px-3 rounded-lg border border-[#EAE8E1] bg-white text-xs outline-none focus:border-[#1A56FF] placeholder:text-[#C8C5BB]" />
                    <p className="text-[10px] text-[#C8C5BB] mt-1">A resposta do cliente vira anotação no lead, e aparece no card do funil.</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => adicionar('mensagem')} disabled={fluxo.etapas.length >= 12}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border-2 border-dashed border-[#EAE8E1] text-xs font-bold text-[#8C8880] hover:border-[#0DB57A] hover:text-[#0DB57A] disabled:opacity-40">
              <Plus className="size-3.5" /> Mensagem
            </button>
            <button onClick={() => adicionar('pergunta')} disabled={fluxo.etapas.length >= 12}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border-2 border-dashed border-[#EAE8E1] text-xs font-bold text-[#8C8880] hover:border-[#F59E0B] hover:text-[#F59E0B] disabled:opacity-40">
              <Plus className="size-3.5" /> Pergunta
            </button>
          </div>

          <button onClick={() => setFluxo(f => ({ ...f, atribuirVendedor: !f.atribuirVendedor }))}
            className="flex items-center justify-between w-full px-3 h-11 rounded-xl bg-[#F7F6F3] border border-[#EAE8E1] mt-4">
            <span className="flex items-center gap-2 text-sm font-medium text-[#2E2D29]">
              <Users className="size-4 text-[#8C8880]" /> Ao terminar, entregar o lead a um vendedor
            </span>
            <span className={`relative w-10 h-5 rounded-full transition-colors ${fluxo.atribuirVendedor ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${fluxo.atribuirVendedor ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
          </button>
          <p className="text-[11px] text-[#C8C5BB] mt-1">Vai para o vendedor com menos leads em aberto.</p>

          <button onClick={guardarFluxo} disabled={salvandoF}
            className="mt-4 h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white"
            style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            {salvandoF ? <Loader2 className="size-4 animate-spin" /> : okF ? <><Check className="size-4" /> Salvo!</> : 'Salvar roteiro'}
          </button>
        </div>
      </GlowCard>

      {/* ── Testar ── */}
      <GlowCard>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="size-4 text-[#8B5CF6]" strokeWidth={1.5} />
            <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Testar o roteiro</h2>
          </div>
          <p className="text-xs text-[#8C8880] mb-3">
            Cada pessoa recebe o roteiro uma única vez. Pra testar de novo com o mesmo número, zere aqui.
          </p>
          <div className="flex gap-2">
            <input value={telTeste} onChange={e => setTelTeste(e.target.value)} placeholder="Telefone (ex: 69 99999-9999)" className={input} />
            <button onClick={reiniciar} disabled={reiniciando || !telTeste.trim()}
              className="h-11 px-5 rounded-xl border border-[#EAE8E1] text-sm font-bold text-[#8C8880] hover:text-[#1A56FF] hover:border-[#1A56FF] shrink-0 disabled:opacity-40">
              {reiniciando ? <Loader2 className="size-4 animate-spin" /> : 'Zerar'}
            </button>
          </div>
          {avisoTeste && <p className="text-xs font-semibold text-[#0DB57A] mt-2 flex items-center gap-1"><Check className="size-3.5" /> {avisoTeste}</p>}
        </div>
      </GlowCard>

      {/* ── SLA ── */}
      <GlowCard>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[#F59E0B]" strokeWidth={1.5} />
              <div>
                <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Alerta de lead sem resposta</h2>
                <p className="text-xs text-[#8C8880]">Avisa o vendedor e, se ele não responder, passa o lead adiante</p>
              </div>
            </div>
            <button onClick={() => setSla(s => ({ ...s, ativo: !s.ativo }))}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${sla.ativo ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sla.ativo ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Avisar o vendedor após</label>
              <div className="flex items-center gap-2">
                <input type="number" min="5" value={sla.minutosAlerta}
                  onChange={e => setSla(s => ({ ...s, minutosAlerta: Number(e.target.value) || 5 }))} className={input} />
                <span className="text-sm text-[#8C8880] shrink-0">min</span>
              </div>
            </div>
            <div>
              <label className={label}>Transferir o lead após</label>
              <div className="flex items-center gap-2">
                <input type="number" min="10" value={sla.minutosTransferencia}
                  onChange={e => setSla(s => ({ ...s, minutosTransferencia: Number(e.target.value) || 10 }))} className={input} />
                <span className="text-sm text-[#8C8880] shrink-0">min</span>
              </div>
            </div>
          </div>

          <button onClick={() => setSla(s => ({ ...s, avisarWhatsapp: !s.avisarWhatsapp }))}
            className="flex items-center justify-between w-full px-3 h-11 rounded-xl bg-[#F7F6F3] border border-[#EAE8E1] mt-4">
            <span className="text-sm font-medium text-[#2E2D29]">Avisar também no WhatsApp do vendedor</span>
            <span className={`relative w-10 h-5 rounded-full transition-colors ${sla.avisarWhatsapp ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sla.avisarWhatsapp ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
          </button>
          <p className="text-[11px] text-[#C8C5BB] mt-1">
            Precisa que o vendedor tenha telefone cadastrado em Vendedores. O alerta aparece no painel de qualquer forma.
          </p>

          <button onClick={guardarSla} disabled={salvandoS}
            className="mt-4 h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white"
            style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            {salvandoS ? <Loader2 className="size-4 animate-spin" /> : okS ? <><Check className="size-4" /> Salvo!</> : 'Salvar alertas'}
          </button>
        </div>
      </GlowCard>
    </div>
  )
}
