'use client'

import { useState } from 'react'
import { updateProduct } from '@/lib/actions/products'
import { FotoUpload } from '@/components/orbi/foto-upload'
import { configProduto, TAMANHOS_SUGERIDOS } from '@/lib/produtos-nicho'
import { X, Package, Loader2, Check, DollarSign, Tag, ScanLine } from 'lucide-react'

type Product = {
  id: string; name: string; price: number; cost_price: number
  tipo_produto: string | null; grife: string | null
  controla_estoque: boolean | null; categoria: string | null; image_url: string | null
  codigo_barras: string | null; tamanho: string | null; cor: string | null
}

export function EditarProdutoModal({ product, onClose, businessType }: { product: Product; onClose: () => void; businessType?: string | null }) {
  const cfg = configProduto(businessType)
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(String(product.price))
  const [costPrice, setCostPrice] = useState(String(product.cost_price))
  const [tipo, setTipo] = useState(product.tipo_produto ?? '')
  const [grife, setGrife] = useState(product.grife ?? '')
  const [controla, setControla] = useState(product.controla_estoque !== false)
  const [imageUrl, setImageUrl] = useState<string | null>(product.image_url)
  const [codigoBarras, setCodigoBarras] = useState(product.codigo_barras ?? '')
  const [tamanho, setTamanho] = useState(product.tamanho ?? '')
  const [cor, setCor] = useState(product.cor ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // usa os tipos da categoria do produto; se ele veio de outro ramo, cai na primeira do ramo atual
  const tiposList = cfg.categorias.find(c => c.key === product.categoria)?.tipos ?? cfg.categorias[0].tipos

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome obrigatório.'); return }
    setLoading(true); setError(null)
    const ncm = tiposList.find(t => t.label === tipo)?.ncm ?? ''
    const result = await updateProduct(product.id, {
      name, price: parseFloat(price.replace(',', '.')) || 0,
      costPrice: parseFloat(costPrice.replace(',', '.')) || 0,
      tipoProduto: tipo, ncm, grife, controlaEstoque: controla, imageUrl, codigoBarras, tamanho, cor,
    })
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    onClose()
  }

  const inputCls = "w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-xs font-bold text-[#2E2D29] uppercase tracking-wider mb-1.5 block"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-2.5">
            <Package className="size-5 text-white" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white">Editar Produto</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="flex justify-center">
            <FotoUpload value={imageUrl} onChange={setImageUrl} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nome do produto *</label>
              <input value={name} onChange={e => setName(e.target.value)} required className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Código de barras</label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#1A56FF]" />
                <input value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                  placeholder="Bipe a etiqueta aqui ou digite o código"
                  className={inputCls.replace('px-4', 'pl-9 pr-3')} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{cfg.usaNcm && product.categoria === 'otica' ? 'Tipo / NCM' : 'Tipo'}</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {tiposList.map(t => <option key={t.label} value={t.label}>{t.emoji} {t.label}{t.ncm ? ` — ${t.ncm}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{cfg.labelMarca}</label>
              <input value={grife} onChange={e => setGrife(e.target.value)}
                placeholder={cfg.usaNcm ? 'Ray-Ban...' : 'BOSS, Clubmen...'} className={inputCls} />
            </div>
            {cfg.usaTamanhoCor && (
              <>
                <div>
                  <label className={labelCls}>Tamanho</label>
                  <input value={tamanho} onChange={e => setTamanho(e.target.value)} list="orbi-tamanhos-edit"
                    placeholder="P, M, G, 42..." className={inputCls} />
                  <datalist id="orbi-tamanhos-edit">
                    {TAMANHOS_SUGERIDOS.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div>
                  <label className={labelCls}>Cor</label>
                  <input value={cor} onChange={e => setCor(e.target.value)} placeholder="Bege, Verde militar..." className={inputCls} />
                </div>
              </>
            )}
            <div>
              <label className={labelCls}>Preço de venda (R$) *</label>
              <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" min="0" required className={inputCls.replace('px-4', 'pl-9 pr-3')} /></div>
            </div>
            <div>
              <label className={labelCls}>Preço de custo (R$)</label>
              <div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#C8C5BB]" />
                <input value={costPrice} onChange={e => setCostPrice(e.target.value)} type="number" step="0.01" min="0" className={inputCls.replace('px-4', 'pl-9 pr-3')} /></div>
            </div>
            <div className="col-span-2">
              <button type="button" onClick={() => setControla(!controla)}
                className="flex items-center justify-between px-3 h-11 w-full rounded-xl bg-[#F7F6F3] border border-[#EAE8E1]">
                <span className="text-sm font-medium text-[#2E2D29]">Controla estoque</span>
                <span className={`relative w-10 h-5 rounded-full transition-colors ${controla ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${controla ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
