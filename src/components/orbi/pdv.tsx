'use client'

import { useState } from 'react'
import { registrarVenda } from '@/lib/actions/vendas'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Loader2, Check,
  Banknote, Smartphone, CreditCard, User, X, AlertTriangle, Wallet
} from 'lucide-react'

type Product = { id: string; name: string; price: number; stock: number; controla_estoque: boolean | null; tipo_produto: string | null; categoria: string | null }
type Contact = { id: string; name: string | null; phone: string }
type CartItem = { product_id: string; nome: string; valor: number; qtd: number; maxStock: number | null }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }

const EMOJIS: Record<string, string> = { Bebida: '🥤', 'Alimento / Snack': '🍫', 'Café / Quente': '☕', Acessório: '🎒' }
function emojiFor(p: Product) {
  if (p.tipo_produto && EMOJIS[p.tipo_produto]) return EMOJIS[p.tipo_produto]
  return p.categoria === 'diversos' ? '🛒' : '👓'
}

const FORMAS = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { key: 'pix', label: 'PIX', icon: Smartphone },
  { key: 'cartao_credito', label: 'Crédito', icon: CreditCard },
  { key: 'cartao_debito', label: 'Débito', icon: CreditCard },
]

export function PDV({ products, contacts, caixaAberto }: { products: Product[]; contacts: Contact[]; caixaAberto: boolean }) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [forma, setForma] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [vendedor, setVendedor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const filteredContacts = contacts.filter(c =>
    contactSearch.length > 0 && !selectedContact &&
    (c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
  ).slice(0, 5)

  function addToCart(p: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === p.id)
      if (ex) {
        if (p.controla_estoque !== false && ex.qtd >= p.stock) return prev
        return prev.map(i => i.product_id === p.id ? { ...i, qtd: i.qtd + 1 } : i)
      }
      return [...prev, { product_id: p.id, nome: p.name, valor: p.price, qtd: 1, maxStock: p.controla_estoque === false ? null : p.stock }]
    })
  }
  function changeQty(id: string, delta: number) {
    setCart(prev => prev.flatMap(i => {
      if (i.product_id !== id) return [i]
      const novaQtd = i.qtd + delta
      if (novaQtd <= 0) return []
      if (i.maxStock !== null && novaQtd > i.maxStock) return [i]
      return [{ ...i, qtd: novaQtd }]
    }))
  }
  function removeItem(id: string) { setCart(prev => prev.filter(i => i.product_id !== id)) }

  const total = cart.reduce((s, i) => s + i.valor * i.qtd, 0)

  async function finalizar() {
    if (cart.length === 0) { setError('Adicione produtos ao carrinho.'); return }
    if (!forma) { setError('Escolha a forma de pagamento.'); return }
    setLoading(true); setError(null)
    const result = await registrarVenda({
      itens: cart.map(({ product_id, nome, valor, qtd }) => ({ product_id, nome, valor, qtd })),
      contactId: selectedContact?.id ?? null,
      clienteNome: selectedContact?.name ?? '',
      vendedor, formaPagamento: forma,
    })
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setSucesso(`Venda #${result.numero} registrada! ${fmt(result.total ?? 0)}${result.noCaixa ? ' — lançada no caixa.' : ''}`)
    setCart([]); setForma(null); setSelectedContact(null); setContactSearch(''); setVendedor('')
    setTimeout(() => setSucesso(null), 4000)
  }

  return (
    <div className="grid grid-cols-5 gap-4" style={{ minHeight: '500px' }}>
      {/* Catálogo */}
      <div className="col-span-3 rounded-2xl border border-[#EAE8E1] bg-white flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#EAE8E1]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-[#C8C5BB] text-center py-10">Nenhum produto. Cadastre na aba "Cadastrar".</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map(p => {
                const semEstoque = p.controla_estoque !== false && p.stock <= 0
                return (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={semEstoque}
                    className="rounded-xl border border-[#EAE8E1] p-3 text-left hover:border-[#1A56FF] hover:bg-[#EEF2FF]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="w-full h-16 rounded-lg flex items-center justify-center text-3xl mb-2" style={{ background: 'linear-gradient(135deg,#EEF2FF,#F0F4FF)' }}>{emojiFor(p)}</div>
                    <p className="text-xs font-bold text-[#1C1B18] truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(p.price)}</span>
                      {p.controla_estoque !== false && <span className="text-[10px] text-[#8C8880]">{p.stock} un</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Carrinho */}
      <div className="col-span-2 rounded-2xl border border-[#EAE8E1] bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EAE8E1] flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#0A0F1E,#1A56FF)' }}>
          <ShoppingCart className="size-4 text-white" strokeWidth={1.5} />
          <p className="text-sm font-bold text-white">Carrinho</p>
          {cart.length > 0 && <span className="ml-auto text-xs text-white/60">{cart.reduce((s, i) => s + i.qtd, 0)} itens</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sucesso && (
            <div className="bg-[#E6F9F3] border border-[#0DB57A]/20 text-[#0DB57A] text-xs font-medium rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Check className="size-4 shrink-0" /> {sucesso}
            </div>
          )}
          {!caixaAberto && cart.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] rounded-xl px-3 py-2 flex items-center gap-1.5">
              <Wallet className="size-3.5 shrink-0" /> Caixa fechado — a venda conta no faturamento, mas não entra no caixa.
            </div>
          )}
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 py-10 text-center">
              <ShoppingCart className="size-8 text-[#EAE8E1]" strokeWidth={1.5} />
              <p className="text-xs text-[#C8C5BB]">Clique nos produtos para adicionar</p>
            </div>
          ) : cart.map(i => (
            <div key={i.product_id} className="flex items-center gap-2 rounded-xl border border-[#EAE8E1] p-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1C1B18] truncate">{i.nome}</p>
                <p className="text-xs text-[#1A56FF] font-bold">{fmt(i.valor * i.qtd)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => changeQty(i.product_id, -1)} className="w-6 h-6 rounded-lg border border-[#EAE8E1] flex items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3]"><Minus className="size-3" /></button>
                <span className="w-6 text-center text-xs font-bold text-[#1C1B18]">{i.qtd}</span>
                <button onClick={() => changeQty(i.product_id, 1)} className="w-6 h-6 rounded-lg border border-[#EAE8E1] flex items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3]"><Plus className="size-3" /></button>
                <button onClick={() => removeItem(i.product_id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 ml-1"><Trash2 className="size-3" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout */}
        <div className="border-t border-[#EAE8E1] p-3 space-y-3">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-2 flex items-center gap-1.5"><AlertTriangle className="size-3.5 shrink-0" />{error}</div>}

          {/* Cliente (opcional) */}
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
            <input value={contactSearch}
              onChange={e => { setContactSearch(e.target.value); setSelectedContact(null); setShowContacts(true) }}
              onFocus={() => setShowContacts(true)}
              placeholder="Cliente (opcional)"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-xs outline-none focus:border-[#1A56FF] placeholder:text-[#C8C5BB]" />
            {showContacts && filteredContacts.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[#EAE8E1] rounded-lg shadow-lg overflow-hidden z-10">
                {filteredContacts.map(c => (
                  <button key={c.id} onClick={() => { setSelectedContact(c); setContactSearch(c.name ?? c.phone); setShowContacts(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F7F6F3] text-xs border-b border-[#EAE8E1] last:border-0">
                    <p className="font-medium text-[#1C1B18]">{c.name ?? 'Sem nome'}</p><p className="text-[#8C8880]">{c.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Forma de pagamento */}
          <div className="grid grid-cols-4 gap-1.5">
            {FORMAS.map(f => (
              <button key={f.key} onClick={() => setForma(f.key)}
                className="flex flex-col items-center gap-0.5 py-2 rounded-lg border-2 transition-all"
                style={{ borderColor: forma === f.key ? '#1A56FF' : '#EAE8E1', background: forma === f.key ? '#EEF2FF' : 'white' }}>
                <f.icon className="size-3.5" style={{ color: forma === f.key ? '#1A56FF' : '#C8C5BB' }} />
                <span className="text-[9px] font-semibold" style={{ color: forma === f.key ? '#1A56FF' : '#8C8880' }}>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Total + finalizar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-[#8C8880]">Total</span>
            <span className="text-xl font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(total)}</span>
          </div>
          <button onClick={finalizar} disabled={loading || cart.length === 0}
            className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ fontFamily: 'Barlow, sans-serif', background: 'linear-gradient(135deg,#0DB57A,#0a9e6a)', boxShadow: '0 4px 16px rgba(13,181,122,0.35)' }}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Finalizar Venda</>}
          </button>
        </div>
      </div>
    </div>
  )
}
