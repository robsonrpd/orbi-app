'use client'

import { useState, useEffect } from 'react'
import { updateCompanyStatus, updateCompanyPlan, extendTrial } from '@/lib/actions/founder'
import {
  Eye, Building2, Clock, CheckCircle2, AlertTriangle,
  Search, MoreVertical, Loader2, Calendar, DollarSign, Ban, Check,
  Sun, Moon, Mail, MessageCircle, Download, X
} from 'lucide-react'

type Company = {
  id: string; name: string; slug: string; business_type: string | null
  subscription_status: string; subscription_plan: string | null
  trial_ends_at: string | null; created_at: string; active: boolean; clientes: number
  owner_email: string | null; owner_name: string | null; owner_phone: string | null
}

const PLAN_PRICE: Record<string, number> = { individual: 97, equipe: 197, ilimitado: 297 }
const PLAN_LABEL: Record<string, string> = { individual: 'Individual', equipe: 'Equipe', ilimitado: 'Ilimitado' }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
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
  const [dark, setDark] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [menu, setMenu] = useState<{ company: Company; x: number; y: number } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('founder_theme')
    if (saved) setDark(saved === 'dark')
  }, [])
  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('founder_theme', next ? 'dark' : 'light')
  }

  // Tokens de tema
  const t = dark ? {
    bg: 'linear-gradient(180deg, #0A0F1E 0%, #0D1635 100%)',
    card: 'rgba(255,255,255,0.04)', cardBorder: 'rgba(255,255,255,0.08)',
    text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.4)', textSub: 'rgba(255,255,255,0.3)',
    rowBorder: 'rgba(255,255,255,0.05)', rowHover: 'rgba(255,255,255,0.03)',
    menuBg: '#0D1635', menuBorder: 'rgba(255,255,255,0.12)', menuText: 'rgba(255,255,255,0.8)',
    inputBg: 'rgba(255,255,255,0.05)', inputBorder: 'rgba(255,255,255,0.1)',
  } : {
    bg: '#F0F2F5',
    card: '#FFFFFF', cardBorder: '#EAE8E1',
    text: '#1C1B18', textMuted: '#8C8880', textSub: '#C8C5BB',
    rowBorder: '#F1F0EC', rowHover: '#F7F6F3',
    menuBg: '#FFFFFF', menuBorder: '#EAE8E1', menuText: '#2E2D29',
    inputBg: '#F7F6F3', inputBorder: '#EAE8E1',
  }

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

  async function act(fn: () => Promise<unknown>) {
    if (!menu) return
    setBusyId(menu.company.id); setMenu(null)
    await fn()
    setBusyId(null)
  }

  function openMenu(e: React.MouseEvent, company: Company) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ company, x: rect.right, y: rect.bottom })
  }

  function enviarEmail(c: Company) {
    if (!c.owner_email) return
    const subject = encodeURIComponent('Orbi. — Sobre sua conta')
    window.open(`mailto:${c.owner_email}?subject=${subject}`, '_blank')
    setMenu(null)
  }
  function enviarWhats(c: Company) {
    if (!c.owner_phone) return
    const phone = c.owner_phone.replace(/\D/g, '')
    const text = encodeURIComponent(`Olá! Aqui é do Orbi. sobre sua conta da ${c.name}.`)
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
    setMenu(null)
  }

  function exportCSV() {
    const headers = ['Ótica', 'Slug', 'Status', 'Plano', 'Clientes', 'E-mail dono', 'Cadastro']
    const rows = companies.map(c => [
      c.name, c.slug, c.subscription_status, c.subscription_plan ?? '', String(c.clientes),
      c.owner_email ?? '', fmtDate(c.created_at)
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `orbi-oticas-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  const kpis = [
    { label: 'MRR Estimado', value: fmt(mrr), icon: DollarSign, color: '#0DB57A' },
    { label: 'Total de Óticas', value: String(total), icon: Building2, color: '#1A56FF' },
    { label: 'Clientes Ativos', value: String(ativas), icon: CheckCircle2, color: '#0DB57A' },
    { label: 'Em Trial', value: String(emTrial), icon: Clock, color: '#1A56FF' },
    { label: 'Trials Expirando', value: String(expirando), icon: AlertTriangle, color: '#F59E0B' },
  ]

  return (
    <div className="min-h-screen" style={{ background: t.bg }} onClick={() => setMenu(null)}>
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#1A56FF', boxShadow: '0 0 24px rgba(26,86,255,0.5)' }}>
              <Eye className="size-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em', color: t.text }}>Painel do Fundador</h1>
              <p className="text-sm" style={{ color: t.textMuted }}>Orbi. — gestão de todas as óticas · {adminEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: t.card, border: `1px solid ${t.cardBorder}`, color: t.textMuted, fontFamily: 'Barlow, sans-serif' }}>
              <Download className="size-3.5" /> CSV
            </button>
            <button onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: t.card, border: `1px solid ${t.cardBorder}`, color: t.text }}>
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <a href="/dashboard" className="text-sm transition-colors hover:underline" style={{ color: t.textMuted }}>← Voltar ao meu painel</a>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {kpis.map(k => (
            <div key={k.label} className="rounded-2xl p-5" style={{ background: t.card, border: `1px solid ${t.cardBorder}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif', color: t.textMuted }}>{k.label}</p>
                <k.icon className="size-4" style={{ color: k.color }} strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-black" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em', color: t.text }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {[
              { key: 'todos', label: 'Todas' }, { key: 'trial', label: 'Trial' },
              { key: 'active', label: 'Ativas' }, { key: 'overdue', label: 'Atrasadas' },
              { key: 'cancelled', label: 'Canceladas' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ fontFamily: 'Barlow, sans-serif', background: filter === f.key ? '#1A56FF' : t.card, color: filter === f.key ? 'white' : t.textMuted, border: `1px solid ${filter === f.key ? '#1A56FF' : t.cardBorder}` }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: t.textSub }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ótica..."
              className="h-9 pl-9 pr-4 w-56 rounded-xl text-sm outline-none transition-all"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.text }} />
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-2xl" style={{ background: t.card, border: `1px solid ${t.cardBorder}` }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                {['Ótica', 'Status', 'Plano', 'Trial', 'Clientes', 'Cadastro', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif', color: t.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: t.textSub }}>Nenhuma ótica encontrada.</td></tr>
              ) : filtered.map(c => {
                const st = STATUS[c.subscription_status] ?? STATUS.trial
                const dias = diasRestantes(c.trial_ends_at)
                return (
                  <tr key={c.id} className="transition-colors" style={{ borderBottom: `1px solid ${t.rowBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(26,86,255,0.2)', color: '#1A56FF' }}>{c.name[0].toUpperCase()}</div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: t.text }}>{c.name}</p>
                          <p className="text-xs" style={{ color: t.textSub }}>{c.owner_email ?? c.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ fontFamily: 'Barlow, sans-serif', background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textMuted }}>{c.subscription_plan ? PLAN_LABEL[c.subscription_plan] : '—'}</td>
                    <td className="px-5 py-3.5">
                      {c.subscription_status === 'trial' && dias !== null ? (
                        <span className="text-xs font-semibold" style={{ color: dias <= 3 ? '#F59E0B' : t.textMuted }}>{dias > 0 ? `${dias} dias` : 'Expirado'}</span>
                      ) : <span className="text-xs" style={{ color: t.textSub }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textMuted }}>{c.clientes}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textMuted }}>{fmtDate(c.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={(e) => { e.stopPropagation(); openMenu(e, c) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                        style={{ color: t.textMuted }}>
                        {busyId === c.id ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menu de ações (fixed — escapa do overflow da tabela) */}
      {menu && (
        <div className="fixed z-50 w-56 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: menu.y + 4, left: Math.min(menu.x - 224, window.innerWidth - 240), background: t.menuBg, border: `1px solid ${t.menuBorder}` }}
          onClick={e => e.stopPropagation()}>

          {menu.company.subscription_status !== 'active' && (
            <button onClick={() => act(() => updateCompanyStatus(menu.company.id, 'active'))}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-black/5" style={{ color: t.menuText }}>
              <Check className="size-3.5 text-[#0DB57A]" /> Marcar como Ativo
            </button>
          )}
          <button onClick={() => act(() => extendTrial(menu.company.id, 14))}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-black/5" style={{ color: t.menuText }}>
            <Calendar className="size-3.5 text-[#1A56FF]" /> Estender trial +14 dias
          </button>

          {/* Mudar plano */}
          <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif', color: t.textSub, borderTop: `1px solid ${t.menuBorder}` }}>Ativar com plano</div>
          {(['individual', 'equipe', 'ilimitado'] as const).map(p => (
            <button key={p} onClick={() => act(async () => { await updateCompanyPlan(menu.company.id, p); await updateCompanyStatus(menu.company.id, 'active') })}
              className="w-full flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-black/5" style={{ color: t.menuText }}>
              <span>{PLAN_LABEL[p]}</span><span className="text-xs" style={{ color: t.textMuted }}>{fmt(PLAN_PRICE[p])}</span>
            </button>
          ))}

          {/* Mensagens */}
          <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif', color: t.textSub, borderTop: `1px solid ${t.menuBorder}` }}>Contato</div>
          {menu.company.owner_email && (
            <button onClick={() => enviarEmail(menu.company)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-black/5" style={{ color: t.menuText }}>
              <Mail className="size-3.5 text-[#8B5CF6]" /> Enviar e-mail
            </button>
          )}
          {menu.company.owner_phone && (
            <button onClick={() => enviarWhats(menu.company)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-black/5" style={{ color: t.menuText }}>
              <MessageCircle className="size-3.5 text-[#0DB57A]" /> Enviar WhatsApp
            </button>
          )}

          {/* Bloquear */}
          {menu.company.subscription_status !== 'cancelled' && (
            <button onClick={() => act(() => updateCompanyStatus(menu.company.id, 'cancelled'))}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors" style={{ borderTop: `1px solid ${t.menuBorder}` }}>
              <Ban className="size-3.5" /> Bloquear / Desativar
            </button>
          )}
          {menu.company.subscription_status === 'cancelled' && (
            <button onClick={() => act(() => updateCompanyStatus(menu.company.id, 'overdue'))}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-black/5" style={{ color: t.menuText, borderTop: `1px solid ${t.menuBorder}` }}>
              <AlertTriangle className="size-3.5 text-[#F59E0B]" /> Marcar como atrasado
            </button>
          )}
        </div>
      )}
    </div>
  )
}
