'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { toggleReviewVisible, deleteReview } from '@/lib/actions/reviews'
import {
  Star, MessageSquare, Eye, EyeOff, AlertTriangle, Search, CheckCircle, XCircle,
  Link2, Copy, Check, Share2, Trash2, Loader2,
} from 'lucide-react'

type Review = {
  id: string; rating: number; comment: string | null; visible: boolean; created_at: string
  author_name: string | null
  contacts: { name: string | null; phone: string } | null
}

type Props = { reviews: Review[]; slug: string }

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`size-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-[#EAE8E1]'}`} strokeWidth={1} />
      ))}
    </div>
  )
}

export function AvaliacoesClient({ reviews, slug }: Props) {
  const [tab, setTab] = useState<'todas' | 'visiveis' | 'analise'>('todas')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const linkAvaliacao = typeof window !== 'undefined' ? `${window.location.origin}/avaliar/${slug}` : `/avaliar/${slug}`

  function copiarLink() {
    navigator.clipboard.writeText(linkAvaliacao)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function compartilharWhats() {
    const texto = encodeURIComponent(`Olá! Que tal avaliar sua experiência com a gente? Leva 10 segundos 💙\n${linkAvaliacao}`)
    window.open(`https://wa.me/?text=${texto}`, '_blank')
  }

  async function publicar(id: string, visible: boolean) {
    setBusyId(id)
    await toggleReviewVisible(id, visible)
    setBusyId(null)
  }

  async function excluir(id: string) {
    setBusyId(id)
    await deleteReview(id)
    setBusyId(null)
  }

  const visible = reviews.filter(r => r.visible)
  const inReview = reviews.filter(r => !r.visible)
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const filtered = reviews
    .filter(r => tab === 'todas' ? true : tab === 'visiveis' ? r.visible : !r.visible)
    .filter(r => !search || (r.author_name ?? r.contacts?.name ?? r.contacts?.phone ?? '').toLowerCase().includes(search.toLowerCase()))

  const metrics = [
    { label: 'MÉDIA GERAL', value: avgRating, icon: Star, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'TOTAL', value: String(reviews.length), icon: MessageSquare, color: '#1A56FF', bg: '#EEF2FF' },
    { label: 'VISÍVEIS', value: String(visible.length), icon: Eye, color: '#0DB57A', bg: '#E6F9F3' },
    { label: 'EM ANÁLISE', value: String(inReview.length), icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          Avaliações dos Clientes
        </h2>
        <p className="text-sm text-[#8C8880] mt-0.5">Visualize e gerencie as avaliações recebidas</p>
      </div>

      {/* Link de avaliação para clientes */}
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A3A6E)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Link2 className="size-5 text-[#93AAFF]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Link de avaliação da loja</p>
            <p className="text-xs text-white/50 truncate">{linkAvaliacao}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={copiarLink}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors">
            {copied ? <><Check className="size-4 text-[#0DB57A]" /> Copiado</> : <><Copy className="size-4" /> Copiar</>}
          </button>
          <button onClick={compartilharWhats}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-sm font-bold transition-all"
            style={{ background: '#0DB57A' }}>
            <Share2 className="size-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map(m => (
          <GlowCard key={m.label}>
            <div className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: m.bg }}>
                <m.icon className="size-5" style={{ color: m.color }} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{m.value}</p>
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>{m.label}</p>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Filtros + Busca */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {([
            { key: 'todas', label: 'Todas' },
            { key: 'visiveis', label: 'Visíveis' },
            { key: 'analise', label: 'Em Análise' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.key ? 'text-white' : 'bg-white border border-[#EAE8E1] text-[#8C8880] hover:text-[#1A56FF]'}`}
              style={tab === t.key ? { background: '#1A56FF', fontFamily: 'Barlow, sans-serif', boxShadow: '0 4px 12px rgba(26,86,255,0.3)' } : { fontFamily: 'Barlow, sans-serif' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="h-9 pl-9 pr-4 w-52 rounded-xl border border-[#EAE8E1] bg-white text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
        </div>
      </div>

      {/* Lista */}
      <GlowCard>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-16 h-16 rounded-full bg-[#F7F6F3] flex items-center justify-center">
              <Star className="size-7 text-[#EAE8E1]" strokeWidth={1} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-[#8C8880]">Nenhuma avaliação encontrada</p>
              <p className="text-sm text-[#C8C5BB] mt-1">As avaliações dos clientes aparecerão aqui</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#F7F6F3]">
            {filtered.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between hover:bg-[#F7F6F3] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center text-sm font-bold text-[#1A56FF] shrink-0">
                    {(r.author_name ?? r.contacts?.name ?? r.contacts?.phone ?? '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[#1C1B18]">{r.author_name ?? r.contacts?.name ?? r.contacts?.phone ?? 'Anônimo'}</p>
                      <StarRating rating={r.rating} />
                    </div>
                    {r.comment && <p className="text-sm text-[#8C8880]">{r.comment}</p>}
                    <p className="text-xs text-[#C8C5BB] mt-1">
                      {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full`}
                    style={{ fontFamily: 'Barlow, sans-serif', background: r.visible ? '#E6F9F3' : '#FEF2F2', color: r.visible ? '#0DB57A' : '#EF4444' }}>
                    {r.visible ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                    {r.visible ? 'Visível' : 'Em Análise'}
                  </span>
                  <button onClick={() => publicar(r.id, !r.visible)} disabled={busyId === r.id}
                    title={r.visible ? 'Ocultar' : 'Publicar'}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C8880] border border-[#EAE8E1] hover:bg-[#F7F6F3] transition-colors">
                    {busyId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : r.visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  <button onClick={() => excluir(r.id)} disabled={busyId === r.id}
                    title="Excluir"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 border border-[#EAE8E1] hover:bg-red-50 transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlowCard>
    </div>
  )
}
