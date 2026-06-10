'use client'

import { useState } from 'react'
import { updateCompanyStatus, updateCompanyPlan, extendTrial } from '@/lib/actions/founder'
import {
  Eye, Building2, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Search, MoreVertical, Loader2, Calendar, Users, DollarSign, X, Ban, Check
} from 'lucide-react'

type Company = {
  id: string; name: string; slug: string; business_type: string | null
  subscription_status: string; subscription_plan: string | null
  trial_ends_at: string | null; created_at: string; active: boolean; clientes: number
}

const PLAN_PRICE: Record<string, number> = { individual: 97, equipe: 197, ilimitado: 297 }
const PLAN_LABEL: Record<string, string> = { individual: 'Individual', equipe: 'Equipe', ilimitado: 'Ilimitado' }

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function diasRestantes(s: string | null) {
  if (!s) return null
  return Math.ceil((new Date(s).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: 'Trial', color: '#1A56FF', bg: 'rgba(26,86,255,0.15)' },
  active: { label: 'Ativo', color: '#0DB57A', bg: 'rgba(13,181,122,0.15)' },
  overdue: { label: 'Atrasado', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  cancelled: { label: 'Cancelado', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
}

export function FounderClient({ companies, mrr, adminEmail }: { companies: Company[]; mrr: number; adminEmail: string }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = companies.filter(c => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
    const mf = filter === 'todos' || c.subscription_status === filter
    return ms && mf
  })

  const total = companies.length
  const ativas = companies.filter(c => c.subscription_status === 'active').length
  const emTrial = companies.filter(c => c.subscription_status === 'trial').length
  const expirando = companies.filter(c => {
    const d = diasRestantes(c.trial_ends_at)
    return c.subscription_status === 'trial' && d !== null && d <= 3 && d >= 0
  }).length

  async function act(fn: () => Promise<unknown>, id: string) {
    setBusyId(id); setMenuId(null)
    await fn()
    setBusyId(null)
  }

  const kpis = [
    { label: 'MRR Estimado', value: fmt(mrr), icon: DollarSign, color: '#0DB57A' },
    { label: 'Total de Óticas', value: String(total), icon: Building2, color: '#93AAFF' },
    { label: 'Clientes Ativos', value: String(ativas), icon: CheckCircle2, color: '#0DB57A' },
    { label: 'Em Trial', value: String(emTrial), icon: Clock, color: '#1A56FF' },
    { label: 'Trials Expirando', value: String(expirando), icon: AlertTriangle, color: '#F59E0B' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#1A56FF', boxShadow: '0 0 24px rgba(26,86,255,0.5)' }}>
            <Eye className="size-6 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
              Painel do Fundador
            </h1>
            <p className="text-sm text-white/40">Orbi. — gestão de todas as óticas · {adminEmail}</p>
          </div>
        </div>
        <a href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">← Voltar ao meu painel</a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>{k.label}</p>
              <k.icon className="size-4" style={{ color: k.color }} strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-black text-white" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {[
            { key: 'todos', label: 'Todas' },
            { key: 'trial', label: 'Trial' },
            { key: 'active', label: 'Ativas' },
            { key: 'overdue', label: 'Atrasadas' },
            { key: 'cancelled', label: 'Canceladas' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.key ? 'bg-[#1A56FF] text-white' : 'text-white/50 hover:text-white/80'}`}
              style={{ fontFamily: 'Barlow, sans-serif', background: filter === f.key ? '#1A56FF' : 'rgba(255,255,255,0.05)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ótica..."
            className="h-9 pl-9 pr-4 w-56 rounded-xl text-sm text-white outline-none placeholder:text-white/30 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Ótica', 'Status', 'Plano', 'Trial', 'Clientes', 'Cadastro', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-white/30">Nenhuma ótica encontrada.</td></tr>
            ) : filtered.map(c => {
              const st = STATUS[c.subscription_status] ?? STATUS.trial
              const dias = diasRestantes(c.trial_ends_at)
              return (
                <tr key={c.id} className="group hover:bg-white/[0.03] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1A56FF]/20 flex items-center justify-center text-xs font-bold text-[#93AAFF]">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-white/30">{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ fontFamily: 'Barlow, sans-serif', background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-white/70">{c.subscription_plan ? PLAN_LABEL[c.subscription_plan] : '—'}</td>
                  <td className="px-5 py-3.5">
                    {c.subscription_status === 'trial' && dias !== null ? (
                      <span className={`text-xs font-semibold ${dias <= 3 ? 'text-[#F59E0B]' : 'text-white/60'}`}>
                        {dias > 0 ? `${dias} dias` : 'Expirado'}
                      </span>
                    ) : <span className="text-xs text-white/30">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-white/60">{c.clientes}</td>
                  <td className="px-5 py-3.5 text-sm text-white/50">{fmtDate(c.created_at)}</td>
                  <td className="px-5 py-3.5 relative">
                    <button onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                      {busyId === c.id ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
                    </button>
                    {menuId === c.id && (
                      <div className="absolute right-5 top-12 z-50 w-52 rounded-xl shadow-2xl overflow-hidden" style={{ background: '#0D1635', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <button onClick={() => act(() => updateCompanyStatus(c.id, 'active'), c.id)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors">
                          <Check className="size-3.5 text-[#0DB57A]" /> Marcar como Ativo
                        </button>
                        <button onClick={() => act(() => extendTrial(c.id, 14), c.id)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors">
                          <Calendar className="size-3.5 text-[#1A56FF]" /> Estender trial +14 dias
                        </button>
                        <div className="px-4 py-1.5 text-[9px] font-bold text-white/30 uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif', borderTop: '1px solid rgba(255,255,255,0.08)' }}>Mudar plano</div>
                        {(['individual', 'equipe', 'ilimitado'] as const).map(p => (
                          <button key={p} onClick={() => act(() => updateCompanyPlan(c.id, p), c.id)}
                            className="w-full flex items-center justify-between px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors">
                            <span>{PLAN_LABEL[p]}</span><span className="text-xs text-white/40">{fmt(PLAN_PRICE[p])}</span>
                          </button>
                        ))}
                        <button onClick={() => act(() => updateCompanyStatus(c.id, 'cancelled'), c.id)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <Ban className="size-3.5" /> Bloquear acesso
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
