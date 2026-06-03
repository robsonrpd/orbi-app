'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { NovaCobrancaModal } from '@/components/orbi/nova-cobranca-modal'
import { TransactionBadge } from '@/components/orbi/status-badge'

type Contact = { id: string; name: string | null; phone: string }
type Transaction = {
  id: string
  amount: number
  status: string
  due_date: string | null
  created_at: string
  contacts: Contact | null
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Props = { transactions: Transaction[]; contacts: Contact[] }

export function FinanceiroClient({ transactions, contacts }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="bg-white rounded-xl border border-[#EAE8E1]">
        <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
            Cobranças
          </h2>
          <Button size="sm" onClick={() => setModalOpen(true)}
            className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
            <PlusCircle className="size-3.5" /> Nova cobrança
          </Button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-[#EAE8E1]">
              {['Cliente', 'Valor', 'Vencimento', 'Status', 'Ação'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider"
                  style={{ fontFamily: 'Barlow, sans-serif' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE8E1]">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E6F9F3] flex items-center justify-center">
                      <PlusCircle className="size-5 text-[#0DB57A]" />
                    </div>
                    <p className="text-sm text-[#8C8880]">Nenhuma cobrança ainda.</p>
                    <Button size="sm" onClick={() => setModalOpen(true)}
                      className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
                      <PlusCircle className="size-3.5" /> Criar primeira cobrança
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} className="hover:bg-[#F7F6F3] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xs font-bold text-[#1A56FF]">
                        {(t.contacts?.name ?? t.contacts?.phone ?? '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[#1C1B18]">
                        {t.contacts?.name ?? t.contacts?.phone ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#1C1B18]">
                    {formatCurrency(Number(t.amount))}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#8C8880]">
                    {t.due_date ? formatDate(t.due_date) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <TransactionBadge status={t.status as 'pending' | 'paid' | 'overdue' | 'cancelled'} />
                  </td>
                  <td className="px-5 py-3.5">
                    {(t.status === 'pending' || t.status === 'overdue') && (
                      <Button variant="outline" size="sm"
                        className="h-7 text-xs border-[#EAE8E1] text-[#1A56FF] hover:bg-[#EEF2FF]">
                        Enviar link
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NovaCobrancaModal open={modalOpen} onClose={() => setModalOpen(false)} contacts={contacts} />
    </>
  )
}
