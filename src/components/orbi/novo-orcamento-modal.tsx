'use client'

import { useState } from 'react'
import { createOrcamento } from '@/lib/actions/orcamentos'
import {
  X, FileText, User, Phone, Calendar, Plus, Trash2,
  Loader2, Check, Wrench, Package, UserCheck, Paperclip
} from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; price: number }
type Product = { id: string; name: string; price: number }
type Item = { tipo: 'servico' | 'produto'; descricao: string; valor: number; qtd: number }

type Props = {
  open: boolean; onClose: () => void
  contacts: Contact[]; services: Service[]; products: Product[]; vendedores: { id: string; nome: string }[]
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function NovoOrcamentoModal({ open, onClose, contacts, services, products, vendedores }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modoCliente, setModoCliente] = useState<'cadastrado' | 'avulso'>('cadastrado')
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [showVend, setShowVend] = useState(false)
  const [validade, setValidade] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [desconto, setDesconto] = useState('')
  const [itens, setItens] = useState<Item[]>([])
  const [anexo, setAnexo] = useState<{ url: string; nome: string } | null>(null)
  const [uploadingAnexo, setUploadingAnexo] = useState(false)

  // mostra a lista ao focar (mesmo sem digitar); filtra ao digitar
  const filtered = contacts.filter(c =>
    !selectedContact && (
      contactSearch.length === 0 ||
      c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch)
    )
  ).slice(0, 8)
  const vendFiltrados = vendedores.filter(v =>
    vendedor.length === 0 || v.nome.toLowerCase().includes(vendedor.toLowerCase())
  ).slice(0, 8)

  if (!open) return null

  function addItem(tipo: 'servico' | 'produto', item?: { name: string; price: number }) {
    setItens(prev => [...prev, { tipo, descricao: item?.name ?? '', valor: item?.price ?? 0, qtd: 1 }])
  }
  function updateItem(i: number, f: keyof Item, v: string | number) {
    setItens(prev => prev.map((it, idx) => idx === i ? { ...it, [f]: v } : it))
  }
  function removeItem(i: number) { setItens(prev => prev.filter((_, idx) => idx !== i)) }

  const subtotal = itens.reduce((s, i) => s + (Number(i.valor) * Number(i.qtd)), 0)
  const total = Math.max(0, subtotal - Number(desconto || 0))

  async function handleAnexoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAnexo(true); setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) setAnexo({ url: data.url, nome: file.name })
      else setError(data.error ?? 'Erro ao anexar arquivo.')
    } catch { setError('Erro ao anexar arquivo.') }
    setUploadingAnexo(false)
  }

  async function handleSubmit() {
    setLoading(true); setError(null)
    const result = await createOrcamento({
      contactId: modoCliente === 'cadastrado' ? (selectedContact?.id ?? null) : null,
      clienteNome: modoCliente === 'cadastrado' ? (selectedContact?.name ?? selectedContact?.phone ?? '') : clienteNome,
      clienteTelefone: modoCliente === 'cadastrado' ? (selectedContact?.phone ?? '') : clienteTel,
      vendedor, itens, desconto: Number(desconto || 0), validade: validade || null, observacoes,
      anexoUrl: anexo?.url ?? null, anexoNome: anexo?.nome ?? null,
    })
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    onClose()
  }

  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><FileText className="size-5 text-white" strokeWidth={1.5} /></div>
            <div><p className="text-sm font-bold text-white">Novo Orçamento</p><p className="text-xs text-white/50">Faça um orçamento e envie por WhatsApp</p></div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          {/* Toggle tipo de cliente */}
          <div className="flex items-center gap-2">
            <button onClick={() => setModoCliente('cadastrado')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modoCliente === 'cadastrado' ? 'bg-[#1A56FF] text-white' : 'bg-[#F7F6F3] text-[#8C8880]'}`}
              style={{ fontFamily: 'Barlow, sans-serif' }}><UserCheck className="size-3.5" /> Cliente cadastrado</button>
            <button onClick={() => setModoCliente('avulso')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modoCliente === 'avulso' ? 'bg-[#1A56FF] text-white' : 'bg-[#F7F6F3] text-[#8C8880]'}`}
              style={{ fontFamily: 'Barlow, sans-serif' }}><User className="size-3.5" /> Cliente avulso</button>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Esquerda */}
            <div className="space-y-4">
              {modoCliente === 'cadastrado' ? (
                <div className="relative">
                  <label className={labelCls}><User className="size-3" /> Cliente</label>
                  <input value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); setSelectedContact(null); setShowContacts(true) }}
                    onFocus={() => setShowContacts(true)} placeholder="Buscar cliente..." className={inputCls} />
                  {showContacts && filtered.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#EAE8E1] rounded-xl shadow-lg overflow-hidden">
                      {filtered.map(c => (
                        <button key={c.id} type="button" onClick={() => { setSelectedContact(c); setContactSearch(c.name ?? c.phone); setShowContacts(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-[#F7F6F3] border-b border-[#EAE8E1] last:border-0">
                          <p className="text-sm font-medium text-[#1C1B18]">{c.name ?? 'Sem nome'}</p>
                          <p className="text-xs text-[#8C8880]">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}><User className="size-3" /> Nome</label>
                    <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome" className={inputCls} /></div>
                  <div><label className={labelCls}><Phone className="size-3" /> Telefone</label>
                    <input value={clienteTel} onChange={e => setClienteTel(e.target.value)} placeholder="85 9..." className={inputCls} /></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="relative"><label className={labelCls}>Vendedor</label>
                  <input value={vendedor} onChange={e => { setVendedor(e.target.value); setShowVend(true) }}
                    onFocus={() => setShowVend(true)} onBlur={() => setTimeout(() => setShowVend(false), 150)}
                    placeholder={vendedores.length ? 'Selecione...' : 'Nome'} className={inputCls} />
                  {showVend && vendFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#EAE8E1] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {vendFiltrados.map(v => (
                        <button key={v.id} type="button" onMouseDown={() => { setVendedor(v.nome); setShowVend(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-[#1C1B18] hover:bg-[#F7F6F3] border-b border-[#EAE8E1] last:border-0">{v.nome}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div><label className={labelCls}><Calendar className="size-3" /> Válido até</label>
                  <input type="date" value={validade} onChange={e => setValidade(e.target.value)} className={inputCls} /></div>
              </div>

              <div><label className={labelCls}>Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} placeholder="Detalhes..."
                  className="w-full resize-none rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] px-3 py-2 text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" /></div>

              <div><label className={labelCls}><Paperclip className="size-3" /> Anexar arquivo modelo (opcional)</label>
                {anexo ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] px-3 h-10">
                    <span className="text-xs text-[#1C1B18] truncate flex items-center gap-1.5"><FileText className="size-3.5 text-[#1A56FF] shrink-0" /> {anexo.nome}</span>
                    <button type="button" onClick={() => setAnexo(null)} className="text-red-400 hover:text-red-500 shrink-0"><X className="size-3.5" /></button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-[#EAE8E1] bg-[#F7F6F3] text-xs text-[#8C8880] cursor-pointer hover:border-[#1A56FF] transition-colors">
                    {uploadingAnexo ? <Loader2 className="size-3.5 animate-spin" /> : <><Paperclip className="size-3.5" /> PDF, Word ou Excel já pronto</>}
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleAnexoUpload} disabled={uploadingAnexo} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Direita — itens */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[#EAE8E1] overflow-hidden">
                <div className="px-3 py-2 bg-[#0A0F1E] flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}><Wrench className="size-3.5 text-[#93AAFF]" /> Serviços</span>
                  <select onChange={e => { const s = services.find(x => x.id === e.target.value); if (s) addItem('servico', s); e.target.value = '' }} className="text-[10px] bg-white/10 text-white rounded-lg px-2 py-1 outline-none" defaultValue="">
                    <option value="" disabled>+ Add</option>
                    {services.map(s => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}
                  </select>
                </div>
                <div className="px-3 py-1 bg-[#0A0F1E]/90 flex items-center justify-end">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5 mr-auto" style={{ fontFamily: 'Barlow, sans-serif' }}><Package className="size-3.5 text-[#93AAFF]" /> Produtos</span>
                  <select onChange={e => { const p = products.find(x => x.id === e.target.value); if (p) addItem('produto', p); e.target.value = '' }} className="text-[10px] bg-white/10 text-white rounded-lg px-2 py-1 outline-none" defaultValue="">
                    <option value="" disabled>+ Add</option>
                    {products.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                  </select>
                </div>
                <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {itens.length === 0 ? <p className="text-xs text-[#C8C5BB] text-center py-4">Nenhum item</p> :
                    itens.map((it, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${it.tipo === 'servico' ? 'bg-[#EEF2FF] text-[#1A56FF]' : 'bg-[#F5F3FF] text-[#8B5CF6]'}`}>{it.tipo === 'servico' ? 'SRV' : 'PRD'}</span>
                        <input value={it.descricao} onChange={e => updateItem(i, 'descricao', e.target.value)} placeholder="Descrição" className="flex-1 h-8 px-2 rounded-lg border border-[#EAE8E1] bg-white text-xs outline-none focus:border-[#1A56FF]" />
                        <input value={it.qtd} onChange={e => updateItem(i, 'qtd', Number(e.target.value))} type="number" min="1" className="w-10 h-8 px-1 rounded-lg border border-[#EAE8E1] bg-white text-xs text-center outline-none" />
                        <input value={it.valor} onChange={e => updateItem(i, 'valor', Number(e.target.value))} type="number" min="0" step="0.01" className="w-16 h-8 px-1 rounded-lg border border-[#EAE8E1] bg-white text-xs text-right outline-none" />
                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:bg-red-50 w-6 h-6 flex items-center justify-center rounded"><Trash2 className="size-3" /></button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-xl bg-[#F7F6F3] p-4 space-y-2">
                <div className="flex items-center justify-between text-sm"><span className="text-[#8C8880]">Subtotal</span><span className="font-semibold text-[#1C1B18]">{fmt(subtotal)}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-[#8C8880]">Desconto</span>
                  <div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#8C8880]">R$</span>
                    <input value={desconto} onChange={e => setDesconto(e.target.value)} type="number" min="0" step="0.01" placeholder="0,00" className="w-full h-8 pl-7 pr-2 rounded-lg border border-[#EAE8E1] bg-white text-sm text-right outline-none focus:border-[#1A56FF]" /></div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#EAE8E1]"><span className="text-sm font-bold text-[#1C1B18]">Total</span><span className="text-lg font-black text-[#1A56FF]" style={{ fontFamily: 'Fraunces, serif' }}>{fmt(total)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#EAE8E1] shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-[2] h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Criar Orçamento</>}
          </button>
        </div>
      </div>
    </div>
  )
}
