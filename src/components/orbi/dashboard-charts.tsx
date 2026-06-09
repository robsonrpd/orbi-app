'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'

function fmtK(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}
function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

type EvolucaoPoint = { mes: string; atual: number; anterior: number }
type EstoquePoint = { name: string; value: number; color: string }
type OSPoint = { name: string; value: number; color: string }

export function EvolucaoVendasChart({ data }: { data: EvolucaoPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EAE8E1" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8C8880' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => fmtK(Number(v))} tick={{ fontSize: 11, fill: '#8C8880' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => fmt(Number(v))}
          contentStyle={{ borderRadius: 12, border: '1px solid #EAE8E1', fontSize: 12, fontFamily: 'Sora, sans-serif' }} />
        <Line type="monotone" dataKey="atual" name="Ano atual" stroke="#1A56FF" strokeWidth={2.5} dot={{ r: 3, fill: '#1A56FF' }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="anterior" name="Ano anterior" stroke="#C8C5BB" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function EstoqueDonut({ data }: { data: EstoquePoint[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-[#C8C5BB]">Sem produtos cadastrados</div>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EAE8E1', fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function OSFunnelChart({ data }: { data: OSPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EAE8E1" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8C8880' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8C8880' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EAE8E1', fontSize: 12 }} cursor={{ fill: '#F7F6F3' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
