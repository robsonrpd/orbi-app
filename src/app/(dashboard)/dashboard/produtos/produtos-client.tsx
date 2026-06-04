'use client'

import { useState, useRef } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import {
  Package, Search, Plus, Edit2, Trash2, ShoppingCart,
  BarChart2, X, Loader2, Check, Camera, AlertTriangle,
  DollarSign, Tag, Archive
} from 'lucide-react'

type Product = {
  id: string; name: string; price: number; cost_price: number
  stock: number; active: boolean; created_at: string
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const EMOJIS = ['👓', '🔭', '💎', '🩺', '✨', '🧴', '📦', '⚗️']

const SUGGESTIONS = [
  'Óculos de grau', 'Óculos de sol', 'Lente de contato', 'Armação infantil',
  'Armação premium', 'Solução para lentes', 'Estojo de óculos', 'Cordão de óculos',
]

type Props = { products: Product[] }

export function ProdutosClient({ products }: Props) {
  const [tab, setTab] = useState<'estoque' | 'vender' | 'vendas' | 'cadastrar'>('estoque')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [error, setError] = useState<string | null>(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome obrigatório.'); return }
    setLoading(true); setError(null)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false); setSaved(true)
    setTimeout(() => { setSaved(false); setTab('estoque') }, 1500)
    setName(''); setPrice(''); setCostPrice(''); setStock('0')
  }

  const TABS = [
    { key: 'estoque', label: 'Estoque', icon: Archive },
    { key: 'vender', label: 'Vender', icon: ShoppingCart },
    { key: 'vendas', label: 'Vendas', icon: BarChart2 },
    { key: 'cadastrar', label: 'Cadastrar', icon: Plus },
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {TABS.map(t => {
            const active = tab === t.key as typeof tab
            return (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${active ? 'text-white' : 'text-[#8C8880] bg-white border border-[#EAE8E1] hover:border-[#1A56FF]/30 hover:text-[#1A56FF]'}`}
                style={active ? { background: 'linear-gradient(135deg,#1A56FF,#1445DD)', fontFamily: 'Barlow, sans-serif', boxShadow: '0 4px 12px rgba(26,86,255,0.3)' } : { fontFamily: 'Barlow, sans-serif' }}>
                <t.icon className="size-3.5" /> {t.label}
              </button>
            )
          })}
        </div>
        {tab === 'estoque' && (
          <button onClick={() => setTab('cadastrar')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: '#1A56FF', boxShadow: '0 4px 12px rgba(26,86,255,0.3)', fontFamily: 'Barlow, sans-serif' }}>
            <Plus className="size-4" /> Novo Produto
          </button>
        )}
      </div>

      {/* Alerta estoque baixo */}
      {lowStock.length > 0 && tab === 'estoque' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="size-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{lowStock.length} produto{lowStock.length > 1 ? 's' : ''}</strong> com estoque baixo:
            {lowStock.map(p => <span key={p.id} className="ml-1 font-semibold">{p.name}</span>)}
          </p>
        </div>
      )}

      {/* Estoque */}
      {tab === 'estoque' && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-white text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
          </div>

          {filtered.length === 0 ? (
            <GlowCard>
              <div className="p-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                  <Package className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-[#1C1B18]">Nenhum produto cadastrado</p>
                  <p className="text-sm text-[#8C8880] mt-1">Cadastre produtos para controlar seu estoque.</p>
                </div>
                <button onClick={() => setTab('cadastrar')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                  <Plus className="size-4" /> Cadastrar produto
                </button>
              </div>
            </GlowCard>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((p, i) => {
                const isLow = p.stock > 0 && p.stock <= 5
                const isOut = p.stock === 0
                return (
                  <GlowCard key={p.id}>
                    <div className="p-4">
                      <div className="relative w-full h-32 rounded-xl mb-3 flex items-center justify-center text-4xl overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #EEF2FF, #F0F4FF)' }}>
                        {EMOJIS[i % EMOJIS.length]}
                        {(isLow || isOut) && (
                          <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full text-white`}
                            style={{ fontFamily: 'Barlow, sans-serif', background: isOut ? '#EF4444' : '#F59E0B' }}>
                            {isOut ? 'SEM ESTOQUE' : 'BAIXO'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-[#1C1B18] truncate mb-1">{p.name}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>
                          {fmt(p.price)}
                        </span>
                        <span className="text-xs text-[#8C8880]">{p.stock} un.</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-semibold text-[#1A56FF] border border-[#EAE8E1] hover:bg-[#EEF2FF] transition-colors">
                          <Edit2 className="size-3" /> Editar
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C8880] border border-[#EAE8E1] hover:bg-[#F7F6F3] transition-colors">
                          <Archive className="size-3.5" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 border border-[#EAE8E1] hover:bg-red-50 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </GlowCard>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Vender */}
      {tab === 'vender' && (
        <GlowCard>
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
              <ShoppingCart className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-base font-bold text-[#1C1B18]">Ponto de Venda</p>
              <p className="text-sm text-[#8C8880] mt-1 max-w-xs">Registre vendas de produtos para seus clientes diretamente pelo painel.</p>
            </div>
            <p className="text-xs text-[#C8C5BB]">Em breve — integração com cobranças via Asaas</p>
          </div>
        </GlowCard>
      )}

      {/* Vendas */}
      {tab === 'vendas' && (
        <GlowCard>
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E6F9F3] flex items-center justify-center">
              <BarChart2 className="size-7 text-[#0DB57A]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-base font-bold text-[#1C1B18]">Histórico de Vendas</p>
              <p className="text-sm text-[#8C8880] mt-1">Nenhuma venda registrada ainda.</p>
            </div>
          </div>
        </GlowCard>
      )}

      {/* Cadastrar */}
      {tab === 'cadastrar' && (
        <div className="max-w-2xl">
          <GlowCard>
            <div className="p-6 border-b border-[#EAE8E1]">
              <div className="flex items-center gap-2">
                <Package className="size-5 text-[#1A56FF]" strokeWidth={1.5} />
                <h2 className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                  Novo Produto
                </h2>
              </div>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
              )}

              {/* Upload foto (decorativo) */}
              <div className="flex justify-center">
                <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-[#EAE8E1] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#1A56FF] hover:bg-[#EEF2FF]/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#F7F6F3] flex items-center justify-center">
                    <Camera className="size-5 text-[#C8C5BB]" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-[#C8C5BB] text-center font-medium">Adicionar foto<br />
                    <span className="font-normal">JPG, PNG até 5MB</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider flex items-center gap-1" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Nome do produto <span className="text-red-400">*</span>
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} required
                    placeholder="Ex: Óculos de grau, Lente de contato..."
                    className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]" />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTIONS.map(s => (
                      <button key={s} type="button" onClick={() => setName(s)}
                        className="px-2.5 py-1 rounded-full text-xs border border-[#EAE8E1] text-[#8C8880] hover:border-[#1A56FF] hover:text-[#1A56FF] hover:bg-[#EEF2FF] transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Preço de venda (R$) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                    <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" min="0"
                      placeholder="0,00"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Preço de custo (R$) <span className="text-[#C8C5BB] font-normal normal-case tracking-normal ml-1">— para calcular lucro</span>
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                    <input value={costPrice} onChange={e => setCostPrice(e.target.value)} type="number" step="0.01" min="0"
                      placeholder="0,00"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    Estoque inicial
                  </label>
                  <input value={stock} onChange={e => setStock(e.target.value)} type="number" min="0"
                    className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all" />
                  <p className="text-xs text-[#C8C5BB]">Quantidade disponível agora</p>
                </div>

                {price && costPrice && parseFloat(price) > 0 && parseFloat(costPrice) > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                      Margem de lucro
                    </label>
                    <div className="h-11 px-4 rounded-xl bg-[#E6F9F3] border border-[#0DB57A]/20 flex items-center">
                      <span className="text-sm font-bold text-[#0DB57A]">
                        {Math.round(((parseFloat(price) - parseFloat(costPrice)) / parseFloat(price)) * 100)}% de margem
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                {loading ? <Loader2 className="size-4 animate-spin" />
                  : saved ? <><Check className="size-4" /> Produto salvo!</>
                  : <><Package className="size-4" /> Salvar Produto</>}
              </button>
            </form>
          </GlowCard>
        </div>
      )}
    </div>
  )
}
