'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { abrirCaixa, movimentarCaixa, fecharCaixa } from '@/lib/actions/caixa'
import {
  Wallet, Lock, Unlock, ArrowUp, ArrowDown, Loader2, Check,
  TrendingUp, TrendingDown, DollarSign, X, History, AlertTriangle
} from 'lucide-react'

type Movimento = { id: string; tipo: string; valor: number; descricao: string | null; created_at: string }
type Caixa = {
  id: string; saldo_inicial: number; saldo_final: number | null
  total_entradas: number; total_saidas: number; diferenca: number | null
  status: string; aberto_em: string; fechado_em: string | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type Props = { caixaAberto: Caixa | null; movimentos: Movimento[]; historico: Caixa[] }

export function CaixaClient({ caixaAberto, movimentos, historico }: Props) {
  const [loading, setLoading] = useState(false)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [movModal, setMovModal] = useState<'entrada' | 'saida' | null>(null)
  const [fecharModal, setFecharModal] = useState(false)

  async function handleAbrir() {
    setLoading(true)
    await abrirCaixa(parseFloat(saldoInicial.replace(',', '.')) || 0)
    setLoading(false); setSaldoInicial('')
  }

  const esperado = caixaAberto
    ? Number(caixaAberto.saldo_inicial) + Number(caixaAberto.total_entradas) - Number(caixaAberto.total_saidas)
    : 0

  return (
    <div className="space-y-5 max-w-4xl">
      {!caixaAberto ? (
        /* Caixa fechado — abrir */
        <GlowCard>
          <div className="p-10 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-[#EEF2FF] flex items-center justify-center">
              <Lock className="size-9 text-[#1A56FF]" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Caixa Fechado</h2>
              <p className="text-sm text-[#8C8880] mt-1">Abra o caixa informando o fundo de troco inicial.</p>
            </div>
            <div className="w-full max-w-xs">
              <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5 text-center" style={{ fontFamily: 'Barlow, sans-serif' }}>Saldo inicial (fundo de troco)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#8C8880]">R$</span>
                <input value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} type="number" step="0.01" min="0" placeholder="0,00"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-lg font-bold text-center outline-none focus:border-[#1A56FF] transition-all" />
              </div>
            </div>
            <button onClick={handleAbrir} disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Unlock className="size-4" /> Abrir Caixa</>}
            </button>
          </div>
        </GlowCard>
      ) : (
        /* Caixa aberto */
        <>
          <div className="grid grid-cols-4 gap-4">
            <MetricBox label="Saldo Inicial" value={fmt(Number(caixaAberto.saldo_inicial))} icon={Wallet} color="#8C8880" bg="#F1F0EC" />
            <MetricBox label="Entradas" value={fmt(Number(caixaAberto.total_entradas))} icon={TrendingUp} color="#0DB57A" bg="#E6F9F3" />
            <MetricBox label="Saídas" value={fmt(Number(caixaAberto.total_saidas))} icon={TrendingDown} color="#EF4444" bg="#FEF2F2" />
            <MetricBox label="Saldo Atual" value={fmt(esperado)} icon={DollarSign} color="#1A56FF" bg="#EEF2FF" highlight />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setMovModal('entrada')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#0DB57A,#0a9e6a)', fontFamily: 'Barlow, sans-serif' }}>
              <ArrowUp className="size-4" /> Reforço (entrada)
            </button>
            <button onClick={() => setMovModal('saida')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', fontFamily: 'Barlow, sans-serif' }}>
              <ArrowDown className="size-4" /> Sangria (saída)
            </button>
            <button onClick={() => setFecharModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white ml-auto" style={{ background: 'linear-gradient(135deg,#0A0F1E,#1A3A6E)', fontFamily: 'Barlow, sans-serif' }}>
              <Lock className="size-4" /> Fechar Caixa
            </button>
          </div>

          {/* Movimentos */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                  <h3 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Movimentações do Caixa</h3>
                </div>
                <span className="text-xs text-[#8C8880]">Aberto em {fmtDateTime(caixaAberto.aberto_em)}</span>
              </div>
              {movimentos.length === 0 ? (
                <p className="text-sm text-[#C8C5BB] text-center py-8">Nenhuma movimentação ainda</p>
              ) : (
                <div className="divide-y divide-[#F7F6F3]">
                  {movimentos.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: m.tipo === 'entrada' ? '#E6F9F3' : '#FEF2F2' }}>
                          {m.tipo === 'entrada' ? <ArrowUp className="size-4 text-[#0DB57A]" /> : <ArrowDown className="size-4 text-[#EF4444]" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1C1B18]">{m.descricao ?? (m.tipo === 'entrada' ? 'Reforço' : 'Sangria')}</p>
                          <p className="text-xs text-[#C8C5BB]">{fmtDateTime(m.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black" style={{ fontFamily: 'Fraunces, serif', color: m.tipo === 'entrada' ? '#0DB57A' : '#EF4444' }}>
                        {m.tipo === 'entrada' ? '+' : '−'} {fmt(Number(m.valor))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlowCard>
        </>
      )}

      {/* Histórico de caixas fechados */}
      {historico.length > 0 && (
        <GlowCard>
          <div className="p-5">
            <h3 className="text-sm font-black text-[#1C1B18] mb-4" style={{ fontFamily: 'Fraunces, serif' }}>Histórico de Fechamentos</h3>
            <div className="divide-y divide-[#F7F6F3]">
              {historico.map(c => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1C1B18]">{c.fechado_em ? fmtDateTime(c.fechado_em) : '—'}</p>
                    <p className="text-xs text-[#8C8880]">Inicial {fmt(Number(c.saldo_inicial))} · Final {fmt(Number(c.saldo_final ?? 0))}</p>
                  </div>
                  {c.diferenca !== null && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${Number(c.diferenca) === 0 ? 'bg-[#E6F9F3] text-[#0DB57A]' : 'bg-amber-50 text-amber-600'}`}>
                      {Number(c.diferenca) === 0 ? 'Conferido ✓' : `Diferença ${fmt(Number(c.diferenca))}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </GlowCard>
      )}

      {/* Modal movimentação */}
      {movModal && caixaAberto && <MovModal caixaId={caixaAberto.id} tipo={movModal} onClose={() => setMovModal(null)} />}
      {/* Modal fechar */}
      {fecharModal && caixaAberto && <FecharModal caixaId={caixaAberto.id} esperado={esperado} onClose={() => setFecharModal(false)} />}
    </div>
  )
}

function MetricBox({ label, value, icon: Icon, color, bg, highlight }: { label: string; value: string; icon: typeof Wallet; color: string; bg: string; highlight?: boolean }) {
  return (
    <GlowCard><div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}><Icon className="size-3.5" style={{ color }} strokeWidth={1.5} /></div>
      </div>
      <p className={`font-black ${highlight ? 'text-2xl text-[#1A56FF]' : 'text-lg text-[#1C1B18]'}`} style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{value}</p>
    </div></GlowCard>
  )
}

function MovModal({ caixaId, tipo, onClose }: { caixaId: string; tipo: 'entrada' | 'saida'; onClose: () => void }) {
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const isEntrada = tipo === 'entrada'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await movimentarCaixa(caixaId, tipo, parseFloat(valor.replace(',', '.')) || 0, desc)
    setLoading(false); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: isEntrada ? 'linear-gradient(135deg,#0DB57A,#0a9e6a)' : 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
          <p className="text-sm font-bold text-white flex items-center gap-2">{isEntrada ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />} {isEntrada ? 'Reforço de Caixa' : 'Sangria de Caixa'}</p>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="size-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Valor *</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8C8880]">R$</span>
              <input value={valor} onChange={e => setValor(e.target.value)} type="number" step="0.01" min="0" required autoFocus className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" /></div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Motivo</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={isEntrada ? 'Ex: troco, reforço' : 'Ex: pagamento, retirada'} className="w-full h-11 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] placeholder:text-[#C8C5BB]" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: isEntrada ? '#0DB57A' : '#EF4444', fontFamily: 'Barlow, sans-serif' }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Confirmar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FecharModal({ caixaId, esperado, onClose }: { caixaId: string; esperado: number; onClose: () => void }) {
  const [valor, setValor] = useState('')
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const contado = parseFloat(valor.replace(',', '.')) || 0
  const diferenca = valor ? contado - esperado : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fecharCaixa(caixaId, contado, obs)
    setLoading(false); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg,#0A0F1E,#1A3A6E)' }}>
          <p className="text-sm font-bold text-white flex items-center gap-2"><Lock className="size-4" /> Fechar Caixa</p>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="size-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="rounded-xl bg-[#F7F6F3] p-4 flex items-center justify-between">
            <span className="text-sm text-[#8C8880]">Saldo esperado</span>
            <span className="text-lg font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(esperado)}</span>
          </div>
          <div>
            <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Valor contado em caixa *</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8C8880]">R$</span>
              <input value={valor} onChange={e => setValor(e.target.value)} type="number" step="0.01" min="0" required autoFocus className="w-full h-12 pl-9 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-lg font-bold outline-none focus:border-[#1A56FF]" /></div>
          </div>
          {diferenca !== null && (
            <div className={`rounded-xl p-3 flex items-center gap-2 ${diferenca === 0 ? 'bg-[#E6F9F3]' : 'bg-amber-50'}`}>
              {diferenca === 0 ? <Check className="size-4 text-[#0DB57A]" /> : <AlertTriangle className="size-4 text-amber-500" />}
              <span className={`text-sm font-semibold ${diferenca === 0 ? 'text-[#0DB57A]' : 'text-amber-700'}`}>
                {diferenca === 0 ? 'Caixa conferido, sem diferença!' : `Diferença de ${fmt(diferenca)} (${diferenca > 0 ? 'sobra' : 'falta'})`}
              </span>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Observações</label>
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" className="w-full h-11 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] placeholder:text-[#C8C5BB]" />
          </div>
          <button type="submit" disabled={loading} className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#0A0F1E,#1A3A6E)', fontFamily: 'Barlow, sans-serif' }}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-4" /> Confirmar Fechamento</>}
          </button>
        </form>
      </div>
    </div>
  )
}
