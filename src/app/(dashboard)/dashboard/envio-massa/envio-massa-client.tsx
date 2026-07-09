'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GlowCard } from '@/components/orbi/glow-card'
import {
  criarBroadcast, pausarBroadcast, retomarBroadcast, cancelarBroadcast, type BroadcastResumo,
} from '@/lib/actions/broadcast'
import type { StatusAquecimento } from '@/lib/whatsapp-warmup'
import {
  Send, AlertTriangle, Users, Clock, Gauge, Pause, Play, X, Loader2, Check, MessageCircle, History, Flame,
} from 'lucide-react'

const INTERVALOS = [
  { v: 10, label: '10 segundos' },
  { v: 15, label: '15 segundos' },
  { v: 20, label: '20 segundos' },
  { v: 30, label: '30 segundos' },
  { v: 45, label: '45 segundos' },
  { v: 60, label: '1 minuto' },
]

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  ativo: { label: 'Enviando', color: '#0DB57A', bg: '#E6F9F3' },
  pausado: { label: 'Pausado', color: '#F59E0B', bg: '#FEF3C7' },
  concluido: { label: 'Concluído', color: '#1A56FF', bg: '#EEF2FF' },
  cancelado: { label: 'Cancelado', color: '#8C8880', bg: '#F1F0EC' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Props = { ativoInicial: BroadcastResumo | null; historicoInicial: BroadcastResumo[]; origens: string[]; aquecimento: StatusAquecimento | null }

export function EnvioMassaClient({ ativoInicial, historicoInicial, origens, aquecimento }: Props) {
  const router = useRouter()
  const [ativo, setAtivo] = useState(ativoInicial)
  const [busy, setBusy] = useState(false)

  useEffect(() => setAtivo(ativoInicial), [ativoInicial])

  // enquanto há campanha ativa, atualiza a tela periodicamente
  useEffect(() => {
    if (!ativo || ativo.status !== 'ativo') return
    const t = setInterval(() => router.refresh(), 12000)
    return () => clearInterval(t)
  }, [ativo, router])

  async function pausar() { if (!ativo) return; setBusy(true); await pausarBroadcast(ativo.id); setBusy(false); router.refresh() }
  async function retomar() { if (!ativo) return; setBusy(true); await retomarBroadcast(ativo.id); setBusy(false); router.refresh() }
  async function cancelar() { if (!ativo) return; setBusy(true); await cancelarBroadcast(ativo.id); setBusy(false); router.refresh() }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start gap-3 rounded-2xl border border-[#F59E0B]/30 bg-[#FEF3C7]/50 p-4">
        <AlertTriangle className="size-5 text-[#F59E0B] shrink-0 mt-0.5" strokeWidth={1.5} />
        <div className="text-sm text-[#8C6D1F]">
          <p className="font-bold mb-1">Use com cuidado — risco de bloqueio do WhatsApp</p>
          <p>O envio é feito aos poucos, respeitando o intervalo e o limite diário que você configurar, mas isso <strong>reduz</strong> o risco de bloqueio — não elimina. Números recém-conectados devem começar com poucos envios por dia.</p>
        </div>
      </div>

      {aquecimento?.aquecendo && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#1A56FF]/30 bg-[#EEF2FF]/60 p-4">
          <Flame className="size-5 text-[#1A56FF] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-sm text-[#1A3E8C]">
            <p className="font-bold mb-1">
              WhatsApp em aquecimento{aquecimento.diasConectado !== null ? ` — conectado há ${aquecimento.diasConectado} dia${aquecimento.diasConectado === 1 ? '' : 's'}` : ''}
            </p>
            <p>
              Limite diário travado em <strong>{aquecimento.limite} mensagens/dia</strong> automaticamente pra proteger o número, mesmo que você configure mais.
              {aquecimento.proximaFaixaEm ? ` Aumenta em ${aquecimento.proximaFaixaEm} dia${aquecimento.proximaFaixaEm === 1 ? '' : 's'}.` : ''}
            </p>
          </div>
        </div>
      )}

      {ativo ? (
        <CampanhaAtiva ativo={ativo} busy={busy} onPausar={pausar} onRetomar={retomar} onCancelar={cancelar} />
      ) : (
        <NovaCampanha origens={origens} limiteMax={aquecimento?.limite ?? 300} onCriada={() => router.refresh()} />
      )}

      {historicoInicial.length > 0 && <Historico itens={historicoInicial} />}
    </div>
  )
}

function CampanhaAtiva({ ativo, busy, onPausar, onRetomar, onCancelar }: {
  ativo: BroadcastResumo; busy: boolean; onPausar: () => void; onRetomar: () => void; onCancelar: () => void
}) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const st = STATUS_LABEL[ativo.status] ?? STATUS_LABEL.ativo
  const pct = ativo.total > 0 ? Math.round(((ativo.enviados + ativo.falharam) / ativo.total) * 100) : 0

  return (
    <GlowCard>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{ fontFamily: 'Barlow, sans-serif', background: st.bg, color: st.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} /> {st.label}
          </span>
          <span className="text-xs text-[#8C8880]">Iniciado em {fmtDate(ativo.created_at)}</span>
        </div>

        <div className="rounded-xl bg-[#F7F6F3] p-3 text-sm text-[#2E2D29] whitespace-pre-wrap">{ativo.mensagem}</div>

        <div>
          <div className="flex items-center justify-between text-xs text-[#8C8880] mb-1.5">
            <span>{ativo.enviados + ativo.falharam} de {ativo.total} processados</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#F7F6F3] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#1A56FF' }} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="rounded-xl bg-[#E6F9F3] p-2.5"><p className="text-lg font-black text-[#0DB57A]" style={{ fontFamily: 'Fraunces, serif' }}>{ativo.enviados}</p><p className="text-[9px] font-bold text-[#8C8880] uppercase mt-0.5">Enviados</p></div>
          <div className="rounded-xl bg-[#FEF2F2] p-2.5"><p className="text-lg font-black text-red-500" style={{ fontFamily: 'Fraunces, serif' }}>{ativo.falharam}</p><p className="text-[9px] font-bold text-[#8C8880] uppercase mt-0.5">Falharam</p></div>
          <div className="rounded-xl bg-[#EEF2FF] p-2.5"><p className="text-lg font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>{ativo.pendentes}</p><p className="text-[9px] font-bold text-[#8C8880] uppercase mt-0.5">Na fila</p></div>
          <div className="rounded-xl bg-[#F5F3FF] p-2.5"><p className="text-lg font-black text-[#8B5CF6]" style={{ fontFamily: 'Fraunces, serif' }}>{ativo.enviados_hoje}/{ativo.limite_diario}</p><p className="text-[9px] font-bold text-[#8C8880] uppercase mt-0.5">Hoje</p></div>
        </div>

        {ativo.erro && (
          <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
            <AlertTriangle className="size-3.5 shrink-0" /> {ativo.erro}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-[#8C8880]">
          <Clock className="size-3.5" /> 1 mensagem a cada {ativo.intervalo_segundos}s · até {ativo.limite_diario}/dia
        </div>

        <div className="flex gap-3 pt-1">
          {ativo.status === 'ativo' ? (
            <button onClick={onPausar} disabled={busy} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-[#F59E0B] bg-[#FEF3C7] hover:bg-[#FDE9A8]">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <><Pause className="size-4" /> Pausar</>}
            </button>
          ) : (
            <button onClick={onRetomar} disabled={busy} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#0DB57A' }}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <><Play className="size-4" /> Retomar</>}
            </button>
          )}
          {confirmCancel ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setConfirmCancel(false)} className="text-xs font-semibold text-[#8C8880] px-2">Voltar</button>
              <button onClick={onCancelar} disabled={busy} className="h-10 px-4 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600">Confirmar cancelamento</button>
            </div>
          ) : (
            <button onClick={() => setConfirmCancel(true)} disabled={busy} className="h-10 px-4 rounded-xl text-sm font-semibold text-red-500 border border-[#EAE8E1] hover:bg-red-50">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
    </GlowCard>
  )
}

function NovaCampanha({ origens, limiteMax, onCriada }: { origens: string[]; limiteMax: number; onCriada: () => void }) {
  const [mensagem, setMensagem] = useState('')
  const [todos, setTodos] = useState(true)
  const [origensSel, setOrigensSel] = useState<Set<string>>(new Set())
  const [intervalo, setIntervalo] = useState(15)
  const [limite, setLimite] = useState(String(Math.min(100, limiteMax)))
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{ total: number; limiteAplicado: number; reduzido: boolean } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function toggleOrigem(o: string) {
    setOrigensSel(s => { const n = new Set(s); n.has(o) ? n.delete(o) : n.add(o); return n })
  }

  async function iniciar() {
    setLoading(true); setError(null)
    const r = await criarBroadcast({
      mensagem, todos, origens: [...origensSel],
      intervaloSegundos: intervalo, limiteDiario: parseInt(limite) || 100,
    })
    setLoading(false)
    if (r?.error) { setError(r.error); setConfirmando(false); return }
    setSucesso({ total: r.total ?? 0, limiteAplicado: r.limiteAplicado ?? 0, reduzido: !!r.limiteReduzidoPorAquecimento })
    setTimeout(onCriada, 1800)
  }

  if (sucesso !== null) {
    return (
      <GlowCard>
        <div className="p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[#E6F9F3] flex items-center justify-center"><Check className="size-7 text-[#0DB57A]" /></div>
          <p className="text-base font-bold text-[#1C1B18]">Envio iniciado para {sucesso.total} contato{sucesso.total === 1 ? '' : 's'}!</p>
          <p className="text-sm text-[#8C8880]">Acompanhe o progresso aqui na página.</p>
          {sucesso.reduzido && (
            <p className="text-xs text-[#F59E0B] bg-[#FEF3C7] rounded-lg px-3 py-1.5">Limite ajustado pra {sucesso.limiteAplicado}/dia por causa do aquecimento do número.</p>
          )}
        </div>
      </GlowCard>
    )
  }

  return (
    <GlowCard>
      <form ref={formRef} onSubmit={e => { e.preventDefault(); setConfirmando(true) }} className="p-6 space-y-5">
        <div className="flex items-center gap-2 pb-1 border-b border-[#EAE8E1]">
          <Send className="size-4 text-[#1A56FF]" />
          <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Nova campanha</h2>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

        <div>
          <label className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1">Mensagem</label>
          <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} required rows={5}
            placeholder="Oi {{nome}}! Temos uma novidade especial pra você..."
            className="w-full resize-none rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] px-3 py-2.5 text-sm outline-none focus:border-[#1A56FF]" />
          <p className="text-[11px] text-[#C8C5BB] mt-1">Use <code className="bg-[#F7F6F3] px-1 rounded">{'{{nome}}'}</code> pra personalizar com o nome de cada cliente.</p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-2"><Users className="size-3" /> Público</label>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setTodos(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${todos ? 'bg-[#1A56FF] text-white' : 'bg-[#F7F6F3] text-[#8C8880]'}`}>Todos os clientes</button>
            <button type="button" onClick={() => setTodos(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!todos ? 'bg-[#1A56FF] text-white' : 'bg-[#F7F6F3] text-[#8C8880]'}`}>Por origem</button>
          </div>
          {!todos && (
            origens.length === 0 ? (
              <p className="text-xs text-[#C8C5BB]">Nenhuma origem cadastrada nos clientes ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {origens.map(o => (
                  <button type="button" key={o} onClick={() => toggleOrigem(o)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${origensSel.has(o) ? 'bg-[#EEF2FF] border-[#1A56FF] text-[#1A56FF]' : 'bg-white border-[#EAE8E1] text-[#8C8880]'}`}>
                    {o}
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-1"><Clock className="size-3" /> Intervalo entre envios</label>
            <select value={intervalo} onChange={e => setIntervalo(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]">
              {INTERVALOS.map(i => <option key={i.v} value={i.v}>{i.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-1"><Gauge className="size-3" /> Limite por dia</label>
            <input type="number" min={5} max={limiteMax} value={limite} onChange={e => setLimite(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" />
            {limiteMax < 300 && <p className="text-[10px] text-[#C8C5BB] mt-1">Máximo de {limiteMax}/dia enquanto o número está em aquecimento.</p>}
          </div>
        </div>

        <button type="submit" disabled={!mensagem.trim() || (!todos && origensSel.size === 0)}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
          <Send className="size-4" /> Iniciar envio
        </button>
      </form>

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE8E1] flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#F59E0B]" />
              <p className="text-sm font-bold text-[#1C1B18]">Confirmar envio</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#2E2D29]">
                Vai começar a enviar pro <strong>{todos ? 'todos os clientes' : `público filtrado (${origensSel.size} origem${origensSel.size === 1 ? '' : 'ns'})`}</strong>,
                {' '}1 mensagem a cada <strong>{intervalo}s</strong>, até <strong>{limite}/dia</strong>. Não pode ser desfeito depois de começar (mas dá pra pausar/cancelar a qualquer momento).
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmando(false)} className="flex-1 h-10 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Voltar</button>
                <button onClick={iniciar} disabled={loading} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : 'Confirmar e iniciar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlowCard>
  )
}

function Historico({ itens }: { itens: BroadcastResumo[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History className="size-4 text-[#8C8880]" />
        <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Histórico</h3>
      </div>
      <div className="space-y-2">
        {itens.map(b => {
          const st = STATUS_LABEL[b.status] ?? STATUS_LABEL.concluido
          return (
            <div key={b.id} className="rounded-xl border border-[#EAE8E1] bg-white p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-[#2E2D29] truncate flex items-center gap-1.5"><MessageCircle className="size-3.5 text-[#C8C5BB] shrink-0" /> {b.mensagem}</p>
                <p className="text-xs text-[#8C8880] mt-0.5">{fmtDate(b.created_at)} · {b.enviados} enviados de {b.total}</p>
              </div>
              <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full uppercase" style={{ background: st.bg, color: st.color, fontFamily: 'Barlow, sans-serif' }}>{st.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
