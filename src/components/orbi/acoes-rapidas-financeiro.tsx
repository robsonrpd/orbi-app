'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createContaPagar, pagarConta, deleteContaPagar } from '@/lib/actions/contas-pagar'
import { baixarTransacao } from '@/lib/actions/transactions'
import {
  X, ArrowDownCircle, ArrowUpCircle, Wallet,
  Loader2, Check, Trash2, Calendar, Building2,
  Banknote, Smartphone, CreditCard
} from 'lucide-react'

type ContaPagar = {
  id: string; descricao: string; fornecedor: string | null
  valor: number; vencimento: string | null; status: string
}
type Pendente = { id: string; nome: string; valor: number; due_date: string | null }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const FORMAS = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { key: 'pix', label: 'PIX', icon: Smartphone },
  { key: 'cartao_credito', label: 'Crédito', icon: CreditCard },
  { key: 'cartao_debito', label: 'Débito', icon: CreditCard },
]

export function AcoesRapidasFinanceiro({ contasPagar, pendentes }: { contasPagar: ContaPagar[]; pendentes: Pendente[] }) {
  const [panel, setPanel] = useState<'pagar' | 'receber' | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recebendo, setRecebendo] = useState<string | null>(null) // id da cobrança em modo "escolher forma"
  const formRef = useRef<HTMLFormElement>(null)

  async function handleCreateConta(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const result = await createContaPagar(new FormData(formRef.current!))
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    formRef.current?.reset()
  }

  async function receber(id: string, forma: string) {
    setBusyId(id)
    await baixarTransacao(id, forma)
    setBusyId(null); setRecebendo(null)
  }

  const pendentesContas = contasPagar.filter(c => c.status === 'pendente')
  const totalReceber = pendentes.reduce((s, p) => s + p.valor, 0)
  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]"

  return (
    <>
      {/* Menu — 3 ações reais */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setPanel('receber')}
          className="h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ fontFamily: 'Barlow, sans-serif', background: 'linear-gradient(135deg,#0DB57A,#0a9e6a)' }}>
          <ArrowUpCircle className="size-4" strokeWidth={2} /> Recebimento Rápido
        </button>
        <button onClick={() => setPanel('pagar')}
          className="h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ fontFamily: 'Barlow, sans-serif', background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
          <ArrowDownCircle className="size-4" strokeWidth={2} /> Contas a Pagar
        </button>
        <Link href="/dashboard/caixa"
          className="h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ fontFamily: 'Barlow, sans-serif', background: 'linear-gradient(135deg,#1A56FF,#1445DD)' }}>
          <Wallet className="size-4" strokeWidth={2} /> Abrir Caixa
        </Link>
      </div>

      {/* Painel slide-in */}
      {panel && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(10,15,30,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setPanel(null); setRecebendo(null) }}>
          <div className="w-96 bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between shrink-0"
              style={{ background: panel === 'receber' ? 'linear-gradient(135deg,#0DB57A,#0a9e6a)' : 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
              <div className="flex items-center gap-2.5">
                {panel === 'receber' ? <ArrowUpCircle className="size-5 text-white" strokeWidth={1.5} /> : <ArrowDownCircle className="size-5 text-white" strokeWidth={1.5} />}
                <div>
                  <p className="text-sm font-bold text-white">{panel === 'receber' ? 'Recebimento Rápido' : 'Contas a Pagar'}</p>
                  <p className="text-xs text-white/60">{panel === 'receber' ? `${pendentes.length} a receber · ${fmt(totalReceber)}` : `${pendentesContas.length} pendentes`}</p>
                </div>
              </div>
              <button onClick={() => { setPanel(null); setRecebendo(null) }} className="text-white/60 hover:text-white"><X className="size-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {panel === 'receber' ? (
                /* RECEBIMENTO RÁPIDO */
                pendentes.length === 0 ? (
                  <p className="text-sm text-[#C8C5BB] text-center py-10">Nenhuma cobrança a receber 🎉</p>
                ) : (
                  pendentes.map(p => (
                    <div key={p.id} className="rounded-xl border border-[#EAE8E1] p-3">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-sm font-semibold text-[#1C1B18]">{p.nome}</p>
                          {p.due_date && <p className="text-[10px] text-[#8C8880] flex items-center gap-0.5"><Calendar className="size-2.5" />Venc. {fmtDate(p.due_date)}</p>}
                        </div>
                        <span className="text-sm font-black text-[#0DB57A]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(p.valor)}</span>
                      </div>
                      {recebendo === p.id ? (
                        <div className="grid grid-cols-4 gap-1.5 mt-2">
                          {FORMAS.map(f => (
                            <button key={f.key} onClick={() => receber(p.id, f.key)} disabled={busyId === p.id}
                              className="flex flex-col items-center gap-0.5 py-2 rounded-lg border border-[#EAE8E1] hover:border-[#0DB57A] hover:bg-[#E6F9F3] transition-all">
                              {busyId === p.id ? <Loader2 className="size-3.5 animate-spin text-[#0DB57A]" /> : <f.icon className="size-3.5 text-[#8C8880]" />}
                              <span className="text-[9px] font-semibold text-[#8C8880]">{f.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button onClick={() => setRecebendo(p.id)}
                          className="w-full h-8 mt-1 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-[#0DB57A] bg-[#E6F9F3] hover:opacity-80 transition-opacity">
                          <Check className="size-3.5" /> Receber
                        </button>
                      )}
                    </div>
                  ))
                )
              ) : (
                /* CONTAS A PAGAR */
                <>
                  <form ref={formRef} onSubmit={handleCreateConta} className="space-y-3 pb-4 border-b border-[#EAE8E1]">
                    {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-3 py-2">{error}</div>}
                    <input name="descricao" required placeholder="Descrição (ex: conta de luz)" className={inputCls} />
                    <div className="grid grid-cols-2 gap-2">
                      <input name="valor" type="number" step="0.01" min="0" required placeholder="Valor R$" className={inputCls} />
                      <input name="vencimento" type="date" className={inputCls} />
                    </div>
                    <input name="fornecedor" placeholder="Fornecedor (opcional)" className={inputCls} />
                    <button type="submit" disabled={loading}
                      className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', fontFamily: 'Barlow, sans-serif' }}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Adicionar conta</>}
                    </button>
                  </form>
                  {pendentesContas.length === 0 ? (
                    <p className="text-sm text-[#C8C5BB] text-center py-6">Nenhuma conta pendente 🎉</p>
                  ) : pendentesContas.map(c => (
                    <div key={c.id} className="rounded-xl border border-[#EAE8E1] p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#1C1B18]">{c.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.fornecedor && <span className="text-[10px] text-[#8C8880] flex items-center gap-0.5"><Building2 className="size-2.5" />{c.fornecedor}</span>}
                            {c.vencimento && <span className="text-[10px] text-[#8C8880] flex items-center gap-0.5"><Calendar className="size-2.5" />{fmtDate(c.vencimento)}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-black text-[#EF4444]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(Number(c.valor))}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={async () => { setBusyId(c.id); await pagarConta(c.id); setBusyId(null) }} disabled={busyId === c.id}
                          className="flex-1 h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold text-[#0DB57A] bg-[#E6F9F3] hover:opacity-80">
                          {busyId === c.id ? <Loader2 className="size-3 animate-spin" /> : <><Check className="size-3" /> Marcar como pago</>}
                        </button>
                        <button onClick={async () => { setBusyId(c.id); await deleteContaPagar(c.id); setBusyId(null) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="size-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
