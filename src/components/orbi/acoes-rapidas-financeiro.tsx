'use client'

import { useState, useRef } from 'react'
import { createContaPagar, pagarConta, deleteContaPagar } from '@/lib/actions/contas-pagar'
import {
  X, ArrowDownCircle, ArrowUpCircle, Repeat, Wallet,
  Loader2, Check, Trash2, Calendar, Building2
} from 'lucide-react'

type ContaPagar = {
  id: string; descricao: string; fornecedor: string | null
  valor: number; vencimento: string | null; status: string
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const ACOES = [
  { key: 'pagar', label: 'Contas a Pagar', icon: ArrowDownCircle, bg: 'linear-gradient(135deg,#EF4444,#DC2626)' },
  { key: 'receber', label: 'Recebimento Rápido', icon: ArrowUpCircle, bg: 'linear-gradient(135deg,#1A56FF,#1445DD)' },
  { key: 'baixa', label: 'Baixa Financeira', icon: Wallet, bg: 'linear-gradient(135deg,#06B6D4,#0891B2)' },
  { key: 'transferencia', label: 'Transferência', icon: Repeat, bg: 'linear-gradient(135deg,#0DB57A,#0a9e6a)' },
]

export function AcoesRapidasFinanceiro({ contasPagar }: { contasPagar: ContaPagar[] }) {
  const [panel, setPanel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleCreateConta(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const result = await createContaPagar(new FormData(formRef.current!))
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    formRef.current?.reset()
  }

  const pendentes = contasPagar.filter(c => c.status === 'pendente')
  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]"

  return (
    <>
      {/* Menu de ações rápidas coloridas */}
      <div className="grid grid-cols-4 gap-3">
        {ACOES.map(a => (
          <button key={a.key} onClick={() => setPanel(a.key)}
            className="h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: a.bg }}>
            <a.icon className="size-4" strokeWidth={2} /> {a.label}
          </button>
        ))}
      </div>

      {/* Painel slide-in */}
      {panel && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(10,15,30,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPanel(null)}>
          <div className="w-96 bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between shrink-0"
              style={{ background: ACOES.find(a => a.key === panel)?.bg }}>
              <div className="flex items-center gap-2.5">
                {(() => { const A = ACOES.find(a => a.key === panel)!; return <A.icon className="size-5 text-white" strokeWidth={1.5} /> })()}
                <p className="text-sm font-bold text-white">{ACOES.find(a => a.key === panel)?.label}</p>
              </div>
              <button onClick={() => setPanel(null)} className="text-white/60 hover:text-white"><X className="size-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {panel === 'pagar' ? (
                <>
                  {/* Form nova conta */}
                  <form ref={formRef} onSubmit={handleCreateConta} className="space-y-3 pb-4 border-b border-[#EAE8E1]">
                    {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-3 py-2">{error}</div>}
                    <div>
                      <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Descrição *</label>
                      <input name="descricao" required placeholder="Ex: Conta de luz, fornecedor X" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Valor *</label>
                        <input name="valor" type="number" step="0.01" min="0" required placeholder="0,00" className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Vencimento</label>
                        <input name="vencimento" type="date" className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>Fornecedor</label>
                      <input name="fornecedor" placeholder="Nome do fornecedor" className={inputCls} />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', fontFamily: 'Barlow, sans-serif' }}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Adicionar conta</>}
                    </button>
                  </form>

                  {/* Lista de contas pendentes */}
                  <div>
                    <p className="text-xs font-bold text-[#8C8880] uppercase tracking-wider mb-2" style={{ fontFamily: 'Barlow, sans-serif' }}>
                      Pendentes ({pendentes.length})
                    </p>
                    {pendentes.length === 0 ? (
                      <p className="text-sm text-[#C8C5BB] text-center py-6">Nenhuma conta pendente 🎉</p>
                    ) : (
                      <div className="space-y-2">
                        {pendentes.map(c => (
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
                                className="flex-1 h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold text-[#0DB57A] bg-[#E6F9F3] hover:opacity-80 transition-opacity">
                                {busyId === c.id ? <Loader2 className="size-3 animate-spin" /> : <><Check className="size-3" /> Marcar como pago</>}
                              </button>
                              <button onClick={async () => { setBusyId(c.id); await deleteContaPagar(c.id); setBusyId(null) }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50">
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F7F6F3] flex items-center justify-center">
                    {(() => { const A = ACOES.find(a => a.key === panel)!; return <A.icon className="size-6 text-[#C8C5BB]" strokeWidth={1.5} /> })()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1C1B18]">{ACOES.find(a => a.key === panel)?.label}</p>
                    <p className="text-xs text-[#8C8880] mt-1 max-w-[220px]">
                      Em breve — integração com Asaas e contas correntes para movimentação financeira completa.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
