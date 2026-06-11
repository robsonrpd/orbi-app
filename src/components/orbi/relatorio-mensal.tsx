'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { ChevronLeft, ChevronRight, Banknote, Users, Calendar, Receipt, TrendingUp } from 'lucide-react'

type Tx = { amount: number; status: string; paid_at: string | null; created_at: string; contact_id: string | null }
type Appt = { start_at: string }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function RelatorioMensal({ transactions, appointments }: { transactions: Tx[]; appointments: Appt[] }) {
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth()) // 0-11

  function prev() { if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1) }
  function next() { if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1) }

  const inicio = new Date(ano, mes, 1)
  const fim = new Date(ano, mes + 1, 1)
  const inicioAnt = new Date(ano, mes - 1, 1)
  const dataRef = (t: Tx) => new Date(t.status === 'paid' && t.paid_at ? t.paid_at : t.created_at)

  const pagasMes = transactions.filter(t => t.status === 'paid' && dataRef(t) >= inicio && dataRef(t) < fim)
  const pagasAnt = transactions.filter(t => t.status === 'paid' && dataRef(t) >= inicioAnt && dataRef(t) < inicio)
  const faturamento = pagasMes.reduce((s, t) => s + Number(t.amount), 0)
  const faturamentoAnt = pagasAnt.reduce((s, t) => s + Number(t.amount), 0)
  const trend = faturamentoAnt > 0 ? Math.round(((faturamento - faturamentoAnt) / faturamentoAnt) * 100) : (faturamento > 0 ? 100 : 0)

  const agendamentosMes = appointments.filter(a => { const d = new Date(a.start_at); return d >= inicio && d < fim }).length
  const numVendas = pagasMes.length
  const ticketMedio = numVendas > 0 ? faturamento / numVendas : 0
  // Média de clientes/dia: clientes únicos / dias decorridos do mês (ou dias do mês se passado)
  const ehMesAtual = ano === now.getFullYear() && mes === now.getMonth()
  const diasMes = ehMesAtual ? now.getDate() : new Date(ano, mes + 1, 0).getDate()
  const clientesUnicos = new Set(pagasMes.map(t => t.contact_id).filter(Boolean)).size
  const mediaClientesDia = diasMes > 0 ? clientesUnicos / diasMes : 0

  const cards = [
    { label: 'Faturamento do Mês', value: fmt(faturamento), icon: Banknote, color: '#0DB57A', bg: '#E6F9F3', trend },
    { label: 'Média Clientes/Dia', value: mediaClientesDia.toFixed(1), icon: Users, color: '#1A56FF', bg: '#EEF2FF' },
    { label: 'Total de Agendamentos', value: String(agendamentosMes), icon: Calendar, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'Ticket Médio', value: fmt(ticketMedio), icon: Receipt, color: '#8B5CF6', bg: '#F5F3FF' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
          <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Relatório Mensal</h2>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#EAE8E1] rounded-xl px-1.5 py-1">
          <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] transition-colors">
            <ChevronLeft className="size-4 text-[#8C8880]" />
          </button>
          <span className="text-sm font-semibold text-[#1C1B18] min-w-[110px] text-center">{MESES[mes]} {ano}</span>
          <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3] transition-colors">
            <ChevronRight className="size-4 text-[#8C8880]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map(c => (
          <GlowCard key={c.label}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: c.bg }}>
                  <c.icon className="size-4.5" style={{ color: c.color }} strokeWidth={1.5} />
                </div>
                {c.trend !== undefined && (
                  <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${c.trend >= 0 ? 'bg-[#E6F9F3] text-[#0DB57A]' : 'bg-red-50 text-red-500'}`}>
                    {c.trend >= 0 ? '↑' : '↓'} {Math.abs(c.trend)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{c.value}</p>
              <p className="text-[11px] text-[#8C8880] mt-0.5">{c.label}</p>
              {c.trend !== undefined && <p className="text-[10px] text-[#C8C5BB] mt-0.5">vs mês anterior</p>}
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  )
}
