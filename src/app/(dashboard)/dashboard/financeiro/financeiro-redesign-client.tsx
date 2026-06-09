'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { TransactionBadge } from '@/components/orbi/status-badge'
import { NovaCobrancaModal } from '@/components/orbi/nova-cobranca-modal'
import { AcoesRapidasFinanceiro } from '@/components/orbi/acoes-rapidas-financeiro'
import {
  DollarSign, TrendingDown, TrendingUp, RotateCcw,
  Copy, ExternalLink, List, BarChart2, Filter,
  Plus, QrCode, ChevronRight
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Transaction = {
  id: string; amount: number; status: string
  due_date: string | null; created_at: string; notes: string | null
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

  const paid = transactions.filter(t => t.status === 'paid')
  const pending = transactions.filter(t => t.status === 'pending')
  const overdue = transactions.filter(t => t.status === 'overdue')

  const valorTotal = paid.reduce((s, t) => s + Number(t.amount), 0)
  const faturamentoBruto = transactions.reduce((s, t) => s + Number(t.amount), 0)
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
        <AcoesRapidasFinanceiro contasPagar={contasPagar} />

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

            {transactions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-12 h-12 rounded-xl bg-[#F7F6F3] flex items-center justify-center">
                  <DollarSign className="size-6 text-[#EAE8E1]" strokeWidth={1} />
                </div>
                <p className="text-sm text-[#C8C5BB]">Nenhuma transação encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F7F6F3]">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-4 hover:bg-[#F7F6F3] -mx-2 px-2 rounded-xl transition-colors">
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
                      <TransactionBadge status={t.status as 'pending' | 'paid' | 'overdue' | 'cancelled'} />
                      <p className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                        {fmt(Number(t.amount))}
                      </p>
                      <ChevronRight className="size-4 text-[#C8C5BB]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlowCard>
      </div>

      <NovaCobrancaModal open={novaCobrancaOpen} onClose={() => setNovaCobrancaOpen(false)} contacts={contacts} />
    </>
  )
}
