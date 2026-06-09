'use client'

import { useState } from 'react'
import { createOS } from '@/lib/actions/ordens-servico'
import {
  X, FileText, Eye, Stethoscope, Building2, Calendar,
  Plus, Trash2, Loader2, Check, ShieldCheck, Glasses, Package, Wrench
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; price: number }
type Product = { id: string; name: string; price: number }
type Receita = { id: string; data_receita: string; medico: string | null }

type OSItem = { tipo: 'servico' | 'produto'; descricao: string; valor: number; qtd: number }

type Props = {
  open: boolean
  onClose: () => void
  contacts: Contact[]
  services: Service[]
  products: Product[]
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function NovaOSModal({ open, onClose, contacts, services, products }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contactSearch, setContactSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [receitaId, setReceitaId] = useState('')

  const [vendedor, setVendedor] = useState('')
  const [medico, setMedico] = useState('')
  const [laboratorio, setLaboratorio] = useState('')
  const [dataPrevCliente, setDataPrevCliente] = useState('')
  const [dataPrevForn, setDataPrevForn] = useState('')
  const [desconto, setDesconto] = useState('')
  const [sinal, setSinal] = useState('')
  const [garantia, setGarantia] = useState(false)
  const [garantiaNumero, setGarantiaNumero] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [itens, setItens] = useState<OSItem[]>([])

  const filtered = contacts.filter(c =>
    contactSearch.length > 0 && !selectedContact &&
    (c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
  ).slice(0, 5)

  if (!open) return null

  async function selectContact(c: Contact) {
    setSelectedContact(c)
    setContactSearch(c.name ?? c.phone)
    setShowContacts(false)
    // Busca receitas desse cliente
    try {
      const res = await fetch(`/api/receitas-cliente?contact_id=${c.id}`)
      if (res.ok) setReceitas(await res.json())
    } catch { setReceitas([]) }
  }

  function addServico(s?: Service) {
    setItens(prev => [...prev, {
      tipo: 'servico',
      descricao: s?.name ?? '',
      valor: s?.price ?? 0,
      qtd: 1,
    }])
  }
  function addProduto(p?: Product) {
    setItens(prev => [...prev, {
      tipo: 'produto',
      descricao: p?.name ?? '',
      valor: p?.price ?? 0,
      qtd: 1,
    }])
  }
  function updateItem(i: number, field: keyof OSItem, value: string | number) {
    setItens(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }
  function removeItem(i: number) {
    setItens(prev => prev.filter((_, idx) => idx !== i))
  }

  const subtotal = itens.reduce((s, i) => s + (Number(i.valor) * Number(i.qtd)), 0)
  const total = Math.max(0, subtotal - Number(desconto || 0))
  const restante = total - Number(sinal || 0)

  async function handleSubmit() {
    if (!selectedContact) { setError('Selecione um cliente.'); return }
    if (itens.length === 0) { setError('Adicione ao menos um item.'); return }
    setLoading(true); setError(null)

    const result = await createOS({
      contactId: selectedContact.id,
      receitaId: receitaId || null,
      vendedor, medico, laboratorio,
      dataPrevistaCliente: dataPrevCliente || null,
      dataPrevistaFornecedor: dataPrevForn || null,
      itens,
      desconto: Number(desconto || 0),
      sinal: Number(sinal || 0),
      garantia, garantiaNumero, observacoes,
    })
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    onClose()
  }

  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <FileText className="size-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Nova Ordem de Serviço</p>
              <p className="text-xs text-white/50">Pedido de óculos — cliente, receita, produtos e serviços</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Grid: dados (esquerda) + itens (direita) */}
          <div className="grid grid-cols-2 gap-5">

            {/* COLUNA ESQUERDA — dados do pedido */}
            <div className="space-y-4">
              {/* Cliente */}
              <div className="relative">
                <label className={labelCls}><Eye className="size-3" /> Cliente <span className="text-red-400">*</span></label>
                <input value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setSelectedContact(null); setShowContacts(true) }}
                  onFocus={() => setShowContacts(true)}
                  placeholder="Buscar cliente..." className={inputCls} />
                {showContacts && filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#EAE8E1] rounded-xl shadow-lg overflow-hidden">
                    {filtered.map(c => (
                      <button key={c.id} type="button" onClick={() => selectContact(c)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F7F6F3] transition-colors border-b border-[#EAE8E1] last:border-0">
                        <p className="text-sm font-medium text-[#1C1B18]">{c.name ?? 'Sem nome'}</p>
                        <p className="text-xs text-[#8C8880]">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Receita vinculada */}
              {selectedContact && (
                <div>
                  <label className={labelCls}><Glasses className="size-3" /> Receita (RX)</label>
                  <select value={receitaId} onChange={e => setReceitaId(e.target.value)} className={inputCls}>
                    <option value="">Sem receita vinculada</option>
                    {receitas.map(r => (
                      <option key={r.id} value={r.id}>
                        {new Date(r.data_receita + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {r.medico ? ` — ${r.medico}` : ''}
                      </option>
                    ))}
                  </select>
                  {receitas.length === 0 && (
                    <p className="text-[10px] text-[#C8C5BB] mt-1">Cliente sem receitas cadastradas.</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Vendedor</label>
                  <input value={vendedor} onChange={e => setVendedor(e.target.value)} placeholder="Nome" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}><Stethoscope className="size-3" /> Médico</label>
                  <input value={medico} onChange={e => setMedico(e.target.value)} placeholder="Dr(a)..." className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}><Building2 className="size-3" /> Laboratório</label>
                <input value={laboratorio} onChange={e => setLaboratorio(e.target.value)} placeholder="Laboratório responsável" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><Calendar className="size-3" /> Previsão cliente</label>
                  <input type="date" value={dataPrevCliente} onChange={e => setDataPrevCliente(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}><Calendar className="size-3" /> Previsão fornecedor</label>
                  <input type="date" value={dataPrevForn} onChange={e => setDataPrevForn(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Garantia */}
              <div className="rounded-xl border border-[#EAE8E1] p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#1C1B18] flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-[#0DB57A]" /> Garantia
                  </label>
                  <button type="button" onClick={() => setGarantia(!garantia)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${garantia ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${garantia ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {garantia && (
                  <input value={garantiaNumero} onChange={e => setGarantiaNumero(e.target.value)}
                    placeholder="Nº da garantia" className={inputCls} />
                )}
              </div>

              <div>
                <label className={labelCls}>Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
                  placeholder="Detalhes do pedido..."
                  className="w-full resize-none rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] px-3 py-2 text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
              </div>
            </div>

            {/* COLUNA DIREITA — itens */}
            <div className="space-y-4">
              {/* Serviços */}
              <div className="rounded-xl border border-[#EAE8E1] overflow-hidden">
                <div className="px-3 py-2 bg-[#0A0F1E] flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    <Wrench className="size-3.5 text-[#93AAFF]" /> Serviços
                  </span>
                  <select onChange={e => { const s = services.find(x => x.id === e.target.value); if (s) addServico(s); e.target.value = '' }}
                    className="text-[10px] bg-white/10 text-white rounded-lg px-2 py-1 outline-none cursor-pointer" defaultValue="">
                    <option value="" disabled>+ Adicionar</option>
                    {services.map(s => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}
                  </select>
                </div>
                <div className="p-2 space-y-1.5 max-h-32 overflow-y-auto">
                  {itens.filter(i => i.tipo === 'servico').length === 0 ? (
                    <p className="text-xs text-[#C8C5BB] text-center py-3">Nenhum serviço adicionado</p>
                  ) : (
                    itens.map((it, i) => it.tipo === 'servico' && (
                      <ItemRow key={i} item={it} onUpdate={(f, v) => updateItem(i, f, v)} onRemove={() => removeItem(i)} />
                    ))
                  )}
                </div>
              </div>

              {/* Produtos */}
              <div className="rounded-xl border border-[#EAE8E1] overflow-hidden">
                <div className="px-3 py-2 bg-[#0A0F1E] flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    <Package className="size-3.5 text-[#93AAFF]" /> Produtos (armação/lentes)
                  </span>
                  <select onChange={e => { const p = products.find(x => x.id === e.target.value); if (p) addProduto(p); e.target.value = '' }}
                    className="text-[10px] bg-white/10 text-white rounded-lg px-2 py-1 outline-none cursor-pointer" defaultValue="">
                    <option value="" disabled>+ Adicionar</option>
                    {products.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                  </select>
                </div>
                <div className="p-2 space-y-1.5 max-h-32 overflow-y-auto">
                  {itens.filter(i => i.tipo === 'produto').length === 0 ? (
                    <p className="text-xs text-[#C8C5BB] text-center py-3">Nenhum produto adicionado</p>
                  ) : (
                    itens.map((it, i) => it.tipo === 'produto' && (
                      <ItemRow key={i} item={it} onUpdate={(f, v) => updateItem(i, f, v)} onRemove={() => removeItem(i)} />
                    ))
                  )}
                </div>
              </div>

              {/* Totais */}
              <div className="rounded-xl bg-[#F7F6F3] p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8C8880]">Subtotal</span>
                  <span className="font-semibold text-[#1C1B18]">{fmt(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8C8880]">Desconto</span>
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#8C8880]">R$</span>
                    <input value={desconto} onChange={e => setDesconto(e.target.value)} type="number" min="0" step="0.01" placeholder="0,00"
                      className="w-full h-8 pl-7 pr-2 rounded-lg border border-[#EAE8E1] bg-white text-sm text-right outline-none focus:border-[#1A56FF]" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#EAE8E1]">
                  <span className="text-sm font-bold text-[#1C1B18]">Total</span>
                  <span className="text-lg font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8C8880]">Sinal (entrada)</span>
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#8C8880]">R$</span>
                    <input value={sinal} onChange={e => setSinal(e.target.value)} type="number" min="0" step="0.01" placeholder="0,00"
                      className="w-full h-8 pl-7 pr-2 rounded-lg border border-[#EAE8E1] bg-white text-sm text-right outline-none focus:border-[#1A56FF]" />
                  </div>
                </div>
                {Number(sinal) > 0 && (
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-[#8C8880]">Restante</span>
                    <span className="font-bold text-[#F59E0B]">{fmt(restante)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EAE8E1] shrink-0 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-[2] h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Criar Ordem de Serviço</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item, onUpdate, onRemove }: {
  item: OSItem
  onUpdate: (field: keyof OSItem, value: string | number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input value={item.descricao} onChange={e => onUpdate('descricao', e.target.value)}
        placeholder="Descrição"
        className="flex-1 h-8 px-2 rounded-lg border border-[#EAE8E1] bg-white text-xs outline-none focus:border-[#1A56FF]" />
      <input value={item.qtd} onChange={e => onUpdate('qtd', Number(e.target.value))} type="number" min="1"
        className="w-12 h-8 px-1 rounded-lg border border-[#EAE8E1] bg-white text-xs text-center outline-none focus:border-[#1A56FF]" />
      <div className="relative w-20">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8C8880]">R$</span>
        <input value={item.valor} onChange={e => onUpdate('valor', Number(e.target.value))} type="number" min="0" step="0.01"
          className="w-full h-8 pl-6 pr-1 rounded-lg border border-[#EAE8E1] bg-white text-xs text-right outline-none focus:border-[#1A56FF]" />
      </div>
      <button type="button" onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors shrink-0">
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}
