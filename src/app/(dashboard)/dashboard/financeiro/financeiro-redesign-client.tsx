'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { TransactionBadge } from '@/components/orbi/status-badge'
import { NovaCobrancaModal } from '@/components/orbi/nova-cobranca-modal'
import { AcoesRapidasFinanceiro } from '@/components/orbi/acoes-rapidas-financeiro'
import { baixarTransacao } from '@/lib/actions/transactions'
import {
  DollarSign, TrendingDown, TrendingUp, RotateCcw,
  Copy, ExternalLink, List, BarChart2, Filter,
  Plus, QrCode, ChevronRight, X, Loader2, Check, Banknote, CreditCard, Smartphone, FileText
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Transaction = {
  id: string; amount: number; status: string
  due_date: string | null; created_at: string; paid_at: string | null; notes: string | null
  contacts: Contact | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PERIODS = ['Hoje', 'Ontem', '7 dias', '30 dias', 'Mês atual', 'Mês passado']

type ContaPagar = {
  id: string; descricao: string; fornecedor: string | null
  valor: number; vencimento: string | null; status: string
}

type Props = { transactions: Transaction[]; contacts: Contact[]; companySlug: string; contasPagar: ContaPagar[] }

export function FinanceiroRedesignClient({ transactions, contacts, companySlug, contasPagar }: Props) {
  const [period, setPeriod] = useState('30 dias')
  const [view, setView] = useState<'resumo' | 'fluxo'>('resumo')
  const [novaCobrancaOpen, setNovaCobrancaOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [receberTx, setReceberTx] = useState<{ id: string; nome: string; valor: number } | null>(null)

  // Calcula o intervalo de datas conforme o período selecionado
  function rangeFor(p: string): { start: Date; end: Date } {
    const now = new Date()
    const hoje0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (p === 'Hoje') return { start: hoje0, end: now }
    if (p === 'Ontem') {
      const ontem = new Date(hoje0); ontem.setDate(ontem.getDate() - 1)
      return { start: ontem, end: new Date(hoje0.getTime() - 1) }
    }
    if (p === '7 dias') { const s = new Date(hoje0); s.setDate(s.getDate() - 6); return { start: s, end: now } }
    if (p === '30 dias') { const s = new Date(hoje0); s.setDate(s.getDate() - 29); return { start: s, end: now } }
    if (p === 'Mês atual') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    if (p === 'Mês passado') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) }
    return { start: new Date(2000, 0, 1), end: now }
  }
  const { start, end } = rangeFor(period)
  const dataRef = (t: Transaction) => new Date(t.status === 'paid' && t.paid_at ? t.paid_at : t.created_at)
  const transactionsFiltradas = transactions.filter(t => {
    const d = dataRef(t).getTime()
    return d >= start.getTime() && d <= end.getTime()
  })

  const paid = transactionsFiltradas.filter(t => t.status === 'paid')
  const pending = transactionsFiltradas.filter(t => t.status === 'pending')
  const overdue = transactionsFiltradas.filter(t => t.status === 'overdue')

  const valorTotal = paid.reduce((s, t) => s + Number(t.amount), 0)
  const faturamentoBruto = transactionsFiltradas.reduce((s, t) => s + Number(t.amount), 0)
  const reembolsos = 0

  const paymentLink = `orbi-app-saiw.vercel.app/pagar/${companySlug}`

  function copyLink() {
    navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const metrics = [
    { label: 'VALOR TOTAL', value: fmt(valorTotal), sub: `${paid.length} transações`, icon: DollarSign, color: '#0DB57A', bg: '#E6F9F3', border: '#0DB57A' },
    { label: 'FATURAMENTO LÍQUIDO', value: fmt(valorTotal * 0.97), sub: 'Total descontando taxas', icon: TrendingDown, color: '#8B5CF6', bg: '#F5F3FF', border: '#8B5CF6' },
    { label: 'FATURAMENTO BRUTO', value: fmt(faturamentoBruto), sub: 'Total de vendas (incluso pendentes)', icon: TrendingUp, color: '#1A56FF', bg: '#EEF2FF', border: '#1A56FF' },
    { label: 'REEMBOLSOS', value: fmt(reembolsos), sub: '0 devoluções', icon: RotateCcw, color: '#EF4444', bg: '#FEF2F2', border: '#EF4444' },
  ]

  return (
    <>
      <div className="space-y-5">
        {/* Menu de ações rápidas */}
        <AcoesRapidasFinanceiro
          contasPagar={contasPagar}
          pendentes={transactions
            .filter(t => t.status === 'pending' || t.status === 'overdue')
            .map(t => ({ id: t.id, nome: t.contacts?.name ?? t.contacts?.phone ?? '—', valor: Number(t.amount), due_date: t.due_date }))}
        />

        {/* Período */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#8C8880] uppercase tracking-wider mr-1"
            style={{ fontFamily: 'Barlow, sans-serif' }}>
            📅 Período
          </span>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${period === p ? 'text-white' : 'bg-white border border-[#EAE8E1] text-[#8C8880] hover:text-[#1A56FF]'}`}
              style={period === p ? { background: '#1A56FF', fontFamily: 'Barlow, sans-serif', boxShadow: '0 4px 12px rgba(26,86,255,0.3)' } : { fontFamily: 'Barlow, sans-serif' }}>
              {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Métricas — 4/5 */}
          <div className="col-span-4 grid grid-cols-2 gap-4">
            {metrics.map(m => (
              <GlowCard key={m.label}>
                <div className="p-5" style={{ borderTop: `3px solid ${m.border}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: m.bg }}>
                      <m.icon className="size-5" style={{ color: m.color }} strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider text-right" style={{ fontFamily: 'Barlow, sans-serif' }}>
                      {m.label}
                    </p>
                  </div>
                  <p className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                    {m.value}
                  </p>
                  <p className="text-xs text-[#C8C5BB] mt-1">{m.sub}</p>
                </div>
              </GlowCard>
            ))}
          </div>

          {/* Receber no balcão — 1/5 */}
          <GlowCard>
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                  <QrCode className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Receber no balcão
                  </p>
                  <p className="text-[10px] text-[#C8C5BB]">Link e QR para pagamento</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <div className="px-3 py-2 rounded-lg bg-[#F7F6F3] border border-[#EAE8E1]">
                  <p className="text-[10px] text-[#1A56FF] truncate font-medium">{paymentLink}</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={copyLink}
                    className="flex items-center justify-center gap-1 h-8 rounded-lg text-[10px] font-bold border border-[#EAE8E1] hover:bg-[#EEF2FF] hover:text-[#1A56FF] transition-colors text-[#8C8880]"
                    style={{ fontFamily: 'Barlow, sans-serif' }}>
                    <Copy className="size-3" /> {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button className="flex items-center justify-center gap-1 h-8 rounded-lg text-[10px] font-bold border border-[#EAE8E1] hover:bg-[#EEF2FF] hover:text-[#1A56FF] transition-colors text-[#8C8880]"
                    style={{ fontFamily: 'Barlow, sans-serif' }}>
                    <ExternalLink className="size-3" /> Abrir
                  </button>
                </div>
                <button onClick={() => setNovaCobrancaOpen(true)}
                  className="w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold text-white transition-all"
                  style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
                  <Plus className="size-3" /> Nova cobrança
                </button>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Transações */}
        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <List className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                  Transações
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {(['resumo', 'fluxo'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all capitalize ${view === v ? 'bg-[#EEF2FF] text-[#1A56FF] border-[#1A56FF]/20' : 'border-[#EAE8E1] text-[#8C8880] hover:text-[#1A56FF]'}`}
                    style={{ fontFamily: 'Barlow, sans-serif' }}>
                    {v === 'resumo' ? <BarChart2 className="size-3.5" /> : <List className="size-3.5" />}
                    {v === 'resumo' ? 'Resumo' : 'Fluxo de Caixa'}
                  </button>
                ))}
                <button onClick={() => setNovaCobrancaOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
                  <Filter className="size-3.5" /> Filtros
                </button>
              </div>
            </div>

            {transactionsFiltradas.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-12 h-12 rounded-xl bg-[#F7F6F3] flex items-center justify-center">
                  <DollarSign className="size-6 text-[#EAE8E1]" strokeWidth={1} />
                </div>
                <p className="text-sm text-[#C8C5BB]">Nenhuma transação no período</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F7F6F3]">
                {transactionsFiltradas.map(t => {
                  const podeReceber = t.status === 'pending' || t.status === 'overdue'
                  return (
                  <div key={t.id}
                    onClick={() => podeReceber && setReceberTx({ id: t.id, nome: t.contacts?.name ?? t.contacts?.phone ?? '—', valor: Number(t.amount) })}
                    className={`flex items-center justify-between py-4 -mx-2 px-2 rounded-xl transition-colors ${podeReceber ? 'hover:bg-[#EEF2FF] cursor-pointer' : 'hover:bg-[#F7F6F3]'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xs font-bold text-[#1A56FF]">
                        {(t.contacts?.name ?? t.contacts?.phone ?? '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1C1B18]">{t.contacts?.name ?? t.contacts?.phone ?? '—'}</p>
                        <p className="text-xs text-[#C8C5BB]">
                          {t.notes ?? (t.due_date ? `Venc. ${fmtDate(t.due_date)}` : fmtDate(t.created_at))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {podeReceber && (
                        <span className="text-xs font-bold text-[#0DB57A] bg-[#E6F9F3] px-2.5 py-1 rounded-full hidden group-hover:inline">Receber</span>
                      )}
                      <TransactionBadge status={t.status as 'pending' | 'paid' | 'overdue' | 'cancelled'} />
                      <p className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                        {fmt(Number(t.amount))}
                      </p>
                      {podeReceber
                        ? <span className="text-xs font-bold text-[#0DB57A]">Receber →</span>
                        : <ChevronRight className="size-4 text-[#C8C5BB]" />}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </GlowCard>
      </div>

      <NovaCobrancaModal open={novaCobrancaOpen} onClose={() => setNovaCobrancaOpen(false)} contacts={contacts} />
      {receberTx && <ReceberModal tx={receberTx} onClose={() => setReceberTx(null)} />}
    </>
  )
}

const FORMAS_PAGTO = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#0DB57A', bg: '#E6F9F3' },
  { key: 'pix', label: 'PIX', icon: Smartphone, color: '#1A56FF', bg: '#EEF2FF' },
  { key: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'cartao_debito', label: 'Débito', icon: CreditCard, color: '#06B6D4', bg: '#ECFEFF' },
  { key: 'boleto', label: 'Boleto', icon: FileText, color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'outro', label: 'Outro', icon: DollarSign, color: '#8C8880', bg: '#F1F0EC' },
]

function ReceberModal({ tx, onClose }: { tx: { id: string; nome: string; valor: number }; onClose: () => void }) {
  const [forma, setForma] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    if (!forma) { setError('Escolha a forma de pagamento.'); return }
    setLoading(true); setError(null)
    const r = await baixarTransacao(tx.id, forma)
    setLoading(false)
    if (r?.error) { setError(r.error); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg,#0DB57A,#0a9e6a)' }}>
          <div className="flex items-center gap-2.5">
            <Check className="size-5 text-white" strokeWidth={2} />
            <p className="text-sm font-bold text-white">Receber Pagamento</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="size-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Resumo */}
          <div className="rounded-xl bg-[#F7F6F3] p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8C8880]">Recebendo de</p>
              <p className="text-sm font-bold text-[#1C1B18]">{tx.nome}</p>
            </div>
            <p className="text-2xl font-black text-[#0DB57A]" style={{ fontFamily: 'Fraunces, serif' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.valor)}
            </p>
          </div>

          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          {/* Formas de pagamento */}
          <div>
            <p className="text-xs font-bold text-[#8C8880] uppercase tracking-wider mb-2.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Forma de pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMAS_PAGTO.map(f => (
                <button key={f.key} onClick={() => setForma(f.key)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all"
                  style={{ borderColor: forma === f.key ? f.color : '#EAE8E1', background: forma === f.key ? f.bg : 'white' }}>
                  <f.icon className="size-5" style={{ color: forma === f.key ? f.color : '#C8C5BB' }} strokeWidth={1.5} />
                  <span className="text-xs font-semibold" style={{ color: forma === f.key ? f.color : '#8C8880' }}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">Cancelar</button>
            <button onClick={confirmar} disabled={loading}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#0DB57A,#0a9e6a)', boxShadow: '0 4px 16px rgba(13,181,122,0.35)' }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Confirmar Recebimento</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
