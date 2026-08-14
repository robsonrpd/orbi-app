'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { createProduct, deleteProduct, movimentarEstoque } from '@/lib/actions/products'
import { PDV } from '@/components/orbi/pdv'
import { FotoUpload } from '@/components/orbi/foto-upload'
import { EditarProdutoModal } from '@/components/orbi/editar-produto-modal'
import { EtiquetasModal } from '@/components/orbi/etiquetas-modal'
import { configProduto, emojiDoTipo, TAMANHOS_SUGERIDOS } from '@/lib/produtos-nicho'
import {
  Package, Search, Plus, Edit2, Trash2, ShoppingCart,
  BarChart2, X, Loader2, Check, AlertTriangle,
  DollarSign, Tag, Archive, ArrowUp, ArrowDown, RefreshCw, ScanLine, Printer
} from 'lucide-react'

type Product = {
  id: string; name: string; price: number; cost_price: number
  stock: number; active: boolean; created_at: string
  tipo_produto: string | null; ncm: string | null; grife: string | null
  controla_estoque: boolean | null; categoria: string | null; image_url: string | null
  codigo_barras: string | null; tamanho: string | null; cor: string | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

type Contact = { id: string; name: string | null; phone: string }
type Venda = {
  id: string; numero: number; cliente_nome: string | null; vendedor: string | null
  itens: { nome: string; valor: number; qtd: number; product_id?: string }[]; total: number
  forma_pagamento: string | null; created_at: string
  contacts: { name: string | null; phone: string } | null
}

type Props = { products: Product[]; contacts: Contact[]; vendas: Venda[]; caixaAberto: boolean; businessType?: string | null }

export function ProdutosClient({ products, contacts, vendas, caixaAberto, businessType }: Props) {
  const cfg = configProduto(businessType)
  const [tab, setTab] = useState<'estoque' | 'vender' | 'vendas' | 'cadastrar'>('estoque')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movProduct, setMovProduct] = useState<Product | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [etiquetasOpen, setEtiquetasOpen] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [tipo, setTipo] = useState('')
  const [grife, setGrife] = useState('')
  const [controla, setControla] = useState(true)
  const [categoria, setCategoria] = useState<string>(cfg.categorias[0].key)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [codigoBarras, setCodigoBarras] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [cor, setCor] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')

  const filtered = products.filter(p => {
    const termo = search.toLowerCase()
    const matchSearch = p.name.toLowerCase().includes(termo)
      || (p.grife ?? '').toLowerCase().includes(termo)
      || (p.cor ?? '').toLowerCase().includes(termo)
      || (p.tamanho ?? '').toLowerCase().includes(termo)
      || (p.codigo_barras ?? '').includes(search.trim())
    const matchCat = filtroCategoria === 'todos' || (p.categoria ?? '') === filtroCategoria
    return matchSearch && matchCat
  })
  const lowStock = products.filter(p => p.controla_estoque !== false && p.stock > 0 && p.stock <= 5)

  const tiposList = cfg.categorias.find(c => c.key === categoria)?.tipos ?? cfg.categorias[0].tipos
  const fotoPorProduto = new Map(products.filter(p => p.image_url).map(p => [p.id, p.image_url as string]))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome obrigatório.'); return }
    setLoading(true); setError(null)
    const ncm = tiposList.find(t => t.label === tipo)?.ncm ?? ''
    const result = await createProduct({
      name, price: parseFloat(price.replace(',', '.')) || 0,
      costPrice: parseFloat(costPrice.replace(',', '.')) || 0,
      stock: parseInt(stock) || 0, tipoProduto: tipo, ncm, grife, controlaEstoque: controla, categoria, imageUrl,
      codigoBarras, tamanho, cor,
    })
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); setTab('estoque') }, 1200)
    setName(''); setPrice(''); setCostPrice(''); setStock('0'); setTipo(''); setGrife(''); setControla(true); setImageUrl(null)
    setCodigoBarras(''); setTamanho(''); setCor('')
  }

  async function handleDelete(id: string) {
    setDeletingId(id); await deleteProduct(id); setDeletingId(null)
  }

  const TABS = [
    { key: 'estoque', label: 'Estoque', icon: Archive },
    { key: 'vender', label: 'Vender', icon: ShoppingCart },
    { key: 'vendas', label: 'Vendas', icon: BarChart2 },
    { key: 'cadastrar', label: 'Cadastrar', icon: Plus },
  ]

  const inputCls = "w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-xs font-bold text-[#2E2D29] uppercase tracking-wider mb-1.5 block"

  const margem = price && costPrice && parseFloat(price) > 0 && parseFloat(costPrice) > 0
    ? Math.round(((parseFloat(price) - parseFloat(costPrice)) / parseFloat(price)) * 100) : null

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {TABS.map(t => {
            const active = tab === t.key as typeof tab
            return (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${active ? 'text-white' : 'text-[#8C8880] bg-white border border-[#EAE8E1] hover:text-[#1A56FF]'}`}
                style={active ? { background: 'linear-gradient(135deg,#1A56FF,#1445DD)', fontFamily: 'Barlow, sans-serif', boxShadow: '0 4px 12px rgba(26,86,255,0.3)' } : { fontFamily: 'Barlow, sans-serif' }}>
                <t.icon className="size-3.5" /> {t.label}
              </button>
            )
          })}
        </div>
        {tab === 'estoque' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEtiquetasOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#8C8880] bg-white border border-[#EAE8E1] hover:text-[#1A56FF] hover:border-[#1A56FF] transition-colors"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              <Printer className="size-4" /> Etiquetas
            </button>
            <button onClick={() => setTab('cadastrar')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: '#1A56FF', boxShadow: '0 4px 12px rgba(26,86,255,0.3)', fontFamily: 'Barlow, sans-serif' }}>
              <Plus className="size-4" /> Novo Produto
            </button>
          </div>
        )}
      </div>

      {/* Estoque */}
      {tab === 'estoque' && (
        <>
          {lowStock.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                <strong>{lowStock.length} produto{lowStock.length > 1 ? 's' : ''}</strong> com estoque baixo:
                {lowStock.map(p => <span key={p.id} className="ml-1 font-semibold">{p.name}</span>)}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto ou grife..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#EAE8E1] bg-white text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
            </div>
            {/* Filtro de categoria */}
            <div className="flex items-center bg-white border border-[#EAE8E1] rounded-xl p-1">
              {[{ key: 'todos', label: 'Todos' }, ...cfg.categorias.map(c => ({ key: c.key, label: `${c.emoji} ${c.label}` }))].map(f => (
                <button key={f.key} onClick={() => setFiltroCategoria(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroCategoria === f.key ? 'bg-[#1A56FF] text-white' : 'text-[#8C8880]'}`}
                  style={{ fontFamily: 'Barlow, sans-serif' }}>
                  {f.label}
                </button>
              ))}
            </div>
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
              {filtered.map(p => {
                const isLow = p.controla_estoque !== false && p.stock > 0 && p.stock <= 5
                const isOut = p.controla_estoque !== false && p.stock === 0
                return (
                  <GlowCard key={p.id}>
                    <div className="p-4">
                      <div className="relative w-full aspect-square rounded-xl mb-3 flex items-center justify-center text-5xl overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #EEF2FF, #F0F4FF)' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          : emojiDoTipo(p.tipo_produto)}
                        {(isLow || isOut) && (
                          <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                            style={{ fontFamily: 'Barlow, sans-serif', background: isOut ? '#EF4444' : '#F59E0B' }}>
                            {isOut ? 'SEM ESTOQUE' : 'BAIXO'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-[#1C1B18] truncate">{p.name}</p>
                      {(p.tamanho || p.cor) && (
                        <p className="flex items-center gap-1 mb-0.5">
                          {p.tamanho && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#1A56FF]">{p.tamanho}</span>}
                          {p.cor && <span className="text-[11px] text-[#8C8880] truncate">{p.cor}</span>}
                        </p>
                      )}
                      {p.grife && <p className="text-xs text-[#8C8880] mb-1">{p.grife}</p>}
                      {p.codigo_barras
                        ? <p className="text-[10px] text-[#8C8880] flex items-center gap-1 truncate"><ScanLine className="size-2.5 shrink-0 text-[#0DB57A]" />{p.codigo_barras}</p>
                        : <p className="text-[10px] text-[#C8C5BB] flex items-center gap-1"><ScanLine className="size-2.5 shrink-0" />sem código</p>}
                      <div className="flex items-center justify-between mb-3 mt-1">
                        <span className="text-sm font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(p.price)}</span>
                        {p.controla_estoque !== false
                          ? <span className="text-xs text-[#8C8880]">{p.stock} un.</span>
                          : <span className="text-[10px] text-[#C8C5BB]">sem controle</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => setMovProduct(p)}
                          className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-semibold text-[#1A56FF] border border-[#EAE8E1] hover:bg-[#EEF2FF] transition-colors">
                          <RefreshCw className="size-3" /> Movimentar
                        </button>
                        <button onClick={() => setEditProduct(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C8880] border border-[#EAE8E1] hover:bg-[#F7F6F3] transition-colors">
                          <Edit2 className="size-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 border border-[#EAE8E1] hover:bg-red-50 transition-colors">
                          {deletingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
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

      {/* Vender — PDV funcional */}
      {tab === 'vender' && (
        <PDV products={products as never} contacts={contacts} caixaAberto={caixaAberto} />
      )}

      {/* Vendas — histórico */}
      {tab === 'vendas' && (
        vendas.length === 0 ? (
          <GlowCard><div className="p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E6F9F3] flex items-center justify-center"><BarChart2 className="size-7 text-[#0DB57A]" strokeWidth={1.5} /></div>
            <div><p className="text-base font-bold text-[#1C1B18]">Histórico de Vendas</p><p className="text-sm text-[#8C8880] mt-1">Nenhuma venda registrada. Use a aba "Vender" para registrar.</p></div>
          </div></GlowCard>
        ) : (
          <div className="space-y-3">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4">
              <GlowCard><div className="p-4">
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow, sans-serif' }}>Total de Vendas</p>
                <p className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{vendas.length}</p>
              </div></GlowCard>
              <GlowCard><div className="p-4">
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow, sans-serif' }}>Faturado</p>
                <p className="text-2xl font-black text-[#0DB57A]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(vendas.reduce((s, v) => s + Number(v.total), 0))}</p>
              </div></GlowCard>
              <GlowCard><div className="p-4">
                <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow, sans-serif' }}>Itens Vendidos</p>
                <p className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{vendas.reduce((s, v) => s + v.itens.reduce((a, i) => a + Number(i.qtd), 0), 0)}</p>
              </div></GlowCard>
            </div>
            {/* Lista */}
            <GlowCard><div className="divide-y divide-[#F7F6F3]">
              {vendas.map(v => (
                <div key={v.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#F7F6F3] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 text-center px-2 py-1.5 rounded-xl bg-[#0A0F1E]">
                      <p className="text-[9px] text-white/40 uppercase" style={{ fontFamily: 'Barlow, sans-serif' }}>Venda</p>
                      <p className="text-sm font-black text-white" style={{ fontFamily: 'Fraunces, serif' }}>#{v.numero}</p>
                    </div>
                    {/* miniaturas das peças vendidas — a venda guarda só o product_id,
                        então a foto vem do cadastro atual do produto */}
                    <div className="flex -space-x-2 shrink-0">
                      {v.itens.slice(0, 3).map((i, idx) => {
                        const foto = fotoPorProduto.get(i.product_id ?? '')
                        return foto ? (
                          <img key={idx} src={foto} alt="" className="w-9 h-9 rounded-lg object-cover border-2 border-white bg-[#F7F6F3]" />
                        ) : null
                      })}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1C1B18]">
                        {v.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ')}
                      </p>
                      <p className="text-xs text-[#8C8880]">
                        {v.contacts?.name ?? v.cliente_nome ?? 'Cliente avulso'}
                        {' · '}{new Date(v.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {v.forma_pagamento && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#1A56FF] uppercase" style={{ fontFamily: 'Barlow, sans-serif' }}>
                        {v.forma_pagamento.replace('cartao_', '').replace('_', ' ')}
                      </span>
                    )}
                    <p className="text-sm font-black text-[#0DB57A]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(Number(v.total))}</p>
                  </div>
                </div>
              ))}
            </div></GlowCard>
          </div>
        )
      )}

      {/* Cadastrar */}
      {tab === 'cadastrar' && (
        <div className="max-w-2xl">
          <GlowCard>
            <div className="p-6 border-b border-[#EAE8E1]">
              <div className="flex items-center gap-2">
                <Package className="size-5 text-[#1A56FF]" strokeWidth={1.5} />
                <h2 className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Novo Produto</h2>
              </div>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

              {/* Categoria do produto — muda conforme o ramo do negócio */}
              <div>
                <label className={labelCls}>Categoria do produto</label>
                <div className="grid grid-cols-2 gap-3">
                  {cfg.categorias.map(c => {
                    const ativa = categoria === c.key
                    return (
                      <button key={c.key} type="button" onClick={() => { setCategoria(c.key); setTipo('') }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${ativa ? 'border-[#1A56FF] bg-[#EEF2FF]' : 'border-[#EAE8E1] bg-white'}`}>
                        <span className="text-xl">{c.emoji}</span>
                        <div className="text-left">
                          <p className={`text-sm font-bold ${ativa ? 'text-[#1A56FF]' : 'text-[#1C1B18]'}`}>{c.label}</p>
                          <p className="text-[10px] text-[#8C8880]">{c.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-center">
                <FotoUpload value={imageUrl} onChange={setImageUrl} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Nome do produto <span className="text-red-400">*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} required
                    placeholder={cfg.placeholderNome} className={inputCls} />
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Código de barras</label>
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#1A56FF]" />
                    <input value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)}
                      // o leitor envia Enter no fim da leitura — sem isso, o formulário seria enviado antes da hora
                      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                      placeholder="Bipe a etiqueta aqui ou digite o código"
                      className={inputCls.replace('px-4', 'pl-9 pr-3')} />
                  </div>
                  <p className="text-[11px] text-[#C8C5BB] mt-1">
                    Com o código preenchido, basta bipar a peça no PDV que ela entra na venda sozinha.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>{cfg.usaNcm && categoria === 'otica' ? 'Tipo / NCM' : 'Tipo'}</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                    <option value="">Selecione...</option>
                    {tiposList.map(t => (
                      <option key={t.label} value={t.label}>
                        {t.emoji} {t.label}{t.ncm ? ` — ${t.ncm}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{cfg.labelMarca}</label>
                  <input value={grife} onChange={e => setGrife(e.target.value)}
                    placeholder={cfg.usaNcm ? 'Ray-Ban, Oakley...' : 'BOSS, Clubmen...'} className={inputCls} />
                </div>

                {cfg.usaTamanhoCor && (
                  <>
                    <div>
                      <label className={labelCls}>Tamanho</label>
                      <input value={tamanho} onChange={e => setTamanho(e.target.value)} list="orbi-tamanhos"
                        placeholder="P, M, G, 42..." className={inputCls} />
                      <datalist id="orbi-tamanhos">
                        {TAMANHOS_SUGERIDOS.map(t => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className={labelCls}>Cor</label>
                      <input value={cor} onChange={e => setCor(e.target.value)}
                        placeholder="Bege, Verde militar..." className={inputCls} />
                    </div>
                    <div className="col-span-2 -mt-1">
                      <p className="text-[11px] text-[#C8C5BB]">
                        Cada tamanho/cor tem estoque próprio. Cadastre a Polo M e a Polo P separadamente —
                        assim o sistema sabe qual acabou.
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className={labelCls}>Preço de venda (R$) <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                    <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" min="0"
                      placeholder="0,00" className={inputCls.replace('px-4', 'pl-9 pr-3')} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Preço de custo (R$)</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                    <input value={costPrice} onChange={e => setCostPrice(e.target.value)} type="number" step="0.01" min="0"
                      placeholder="0,00" className={inputCls.replace('px-4', 'pl-9 pr-3')} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Estoque inicial</label>
                  <input value={stock} onChange={e => setStock(e.target.value)} type="number" min="0"
                    disabled={!controla} className={inputCls + (controla ? '' : ' opacity-50')} />
                </div>
                <div className="flex flex-col justify-end">
                  <button type="button" onClick={() => setControla(!controla)}
                    className="flex items-center justify-between px-3 h-11 rounded-xl bg-[#F7F6F3] border border-[#EAE8E1]">
                    <span className="text-sm font-medium text-[#2E2D29]">Controla estoque</span>
                    <span className={`relative w-10 h-5 rounded-full transition-colors ${controla ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${controla ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                </div>

                {margem !== null && (
                  <div className="col-span-2">
                    <div className="h-11 px-4 rounded-xl bg-[#E6F9F3] border border-[#0DB57A]/20 flex items-center">
                      <span className="text-sm font-bold text-[#0DB57A]">{margem}% de margem de lucro</span>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : saved ? <><Check className="size-4" /> Produto salvo!</> : <><Package className="size-4" /> Salvar Produto</>}
              </button>
            </form>
          </GlowCard>
        </div>
      )}

      {/* Modal de movimentação */}
      {movProduct && <MovimentacaoModal product={movProduct} onClose={() => setMovProduct(null)} />}
      {editProduct && <EditarProdutoModal product={editProduct} businessType={businessType} onClose={() => setEditProduct(null)} />}
      {etiquetasOpen && <EtiquetasModal products={products} onClose={() => setEtiquetasOpen(false)} />}
    </div>
  )
}

function MovimentacaoModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ajuste'>('entrada')
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseInt(qtd)
    if (!q || q <= 0) { setError('Quantidade inválida.'); return }
    setLoading(true); setError(null)
    const result = await movimentarEstoque({ productId: product.id, tipo, quantidade: q, motivo })
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    onClose()
  }

  const TIPOS_MOV = [
    { key: 'entrada', label: 'Entrada', icon: ArrowUp, color: '#0DB57A', bg: '#E6F9F3' },
    { key: 'saida', label: 'Saída', icon: ArrowDown, color: '#EF4444', bg: '#FEF2F2' },
    { key: 'ajuste', label: 'Ajuste', icon: RefreshCw, color: '#1A56FF', bg: '#EEF2FF' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-2.5">
            <Package className="size-5 text-white" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold text-white">Movimentar Estoque</p>
              <p className="text-xs text-white/50">{product.name} — atual: {product.stock} un.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_MOV.map(t => (
              <button key={t.key} type="button" onClick={() => setTipo(t.key)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all"
                style={{ borderColor: tipo === t.key ? t.color : '#EAE8E1', background: tipo === t.key ? t.bg : 'white' }}>
                <t.icon className="size-4" style={{ color: tipo === t.key ? t.color : '#C8C5BB' }} />
                <span className="text-xs font-bold" style={{ color: tipo === t.key ? t.color : '#8C8880', fontFamily: 'Barlow, sans-serif' }}>{t.label}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'Barlow, sans-serif' }}>
              {tipo === 'ajuste' ? 'Novo valor do estoque' : 'Quantidade'} <span className="text-red-400">*</span>
            </label>
            <input value={qtd} onChange={e => setQtd(e.target.value)} type="number" min="1" required autoFocus
              className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'Barlow, sans-serif' }}>Motivo</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Compra, venda, perda..."
              className="w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white"
              style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Confirmar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
