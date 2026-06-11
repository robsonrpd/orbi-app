'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createContact } from '@/lib/actions/contacts'
import {
  Loader2, UserPlus, X, User, Phone, Mail, MapPin,
  Check, ShieldCheck, Tag, Cake
} from 'lucide-react'

type Props = { open: boolean; onClose: () => void }

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export function NovoClienteModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [active, setActive] = useState(true)
  const [lgpd, setLgpd] = useState('nao_informado')
  const formRef = useRef<HTMLFormElement>(null)

  // Campos de endereço controlados (para auto-preencher via CEP)
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const t = tagInput.trim()
      if (t && !tags.includes(t)) setTags(prev => [...prev, t])
      setTagInput('')
    }
  }
  function removeTag(tag: string) { setTags(prev => prev.filter(t => t !== tag)) }

  async function handleCep(value: string) {
    const cep = value.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setEndereco(data.logradouro ?? '')
        setBairro(data.bairro ?? '')
        setCidade(data.localidade ?? '')
        setUf(data.uf ?? '')
      }
    } catch { /* silencioso */ }
    setCepLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const fd = new FormData(formRef.current!)
    fd.set('tags', tags.join(','))
    fd.set('active', String(active))
    fd.set('lgpd_consent', lgpd)
    const result = await createContact(fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    formRef.current?.reset()
    setTags([]); setEndereco(''); setBairro(''); setCidade(''); setUf('')
    setActive(true); setLgpd('nao_informado')
    onClose()
  }

  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] outline-none focus:border-[#1A56FF] focus:ring-4 focus:ring-[#1A56FF]/10 transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center gap-1 mb-1.5"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white border-[#EAE8E1] p-0 overflow-hidden max-h-[92vh] flex flex-col gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 shrink-0 space-y-0"
          style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <UserPlus className="size-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold">Novo Cliente</p>
              <p className="text-xs text-white/50 font-normal">Preencha os dados do cliente</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Identificação */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}><User className="size-3" /> Nome</label>
              <input name="name" placeholder="Nome completo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><Phone className="size-3" /> WhatsApp <span className="text-red-400">*</span></label>
              <input name="phone" required placeholder="85 99999-9999" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}><Mail className="size-3" /> E-mail</label>
              <input name="email" type="email" placeholder="cliente@email.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><Cake className="size-3" /> Data de nascimento</label>
              <input name="data_nascimento" type="date" max={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}><MapPin className="size-3" /> Como nos conheceu? (origem)</label>
            <select name="origem" className={inputCls} defaultValue="">
              <option value="">Selecione...</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Google">Google</option>
              <option value="Indicação de amigo">Indicação de amigo</option>
              <option value="Indicação médica">Indicação médica</option>
              <option value="Passou em frente">Passou em frente à loja</option>
              <option value="Já era cliente">Já era cliente</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Endereço */}
          <div className="rounded-xl border border-[#EAE8E1] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
              <span className="text-xs font-bold text-[#1C1B18] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                Endereço
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>CEP</label>
                <div className="relative">
                  <input name="cep" placeholder="00000-000"
                    onChange={e => handleCep(e.target.value)}
                    className={inputCls} />
                  {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-[#1A56FF]" />}
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Endereço</label>
                <input name="endereco" value={endereco} onChange={e => setEndereco(e.target.value)}
                  placeholder="Rua, avenida..." className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Número</label>
                <input name="numero" placeholder="123" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Complemento</label>
                <input name="complemento" placeholder="Apto 4" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Bairro</label>
                <input name="bairro" value={bairro} onChange={e => setBairro(e.target.value)}
                  placeholder="Centro" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Cidade</label>
                <input name="cidade" value={cidade} onChange={e => setCidade(e.target.value)}
                  placeholder="Fortaleza" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>UF</label>
                <select name="uf" value={uf} onChange={e => setUf(e.target.value)}
                  className={inputCls}>
                  <option value="">--</option>
                  {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}><Tag className="size-3" /> Tags</label>
            <div className="min-h-10 flex flex-wrap gap-1.5 items-center px-3 py-2 border border-[#EAE8E1] rounded-xl focus-within:ring-4 focus-within:ring-[#1A56FF]/10 focus-within:border-[#1A56FF] bg-[#F7F6F3]">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF2FF] rounded-full text-xs text-[#1A56FF] border border-[#1A56FF]/20">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}><X className="size-2.5" /></button>
                </span>
              ))}
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                placeholder={tags.length === 0 ? 'VIP, novo... (Enter para adicionar)' : ''}
                className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-[#C8C5BB]" />
            </div>
          </div>

          {/* LGPD + Ativo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#EAE8E1] p-3">
              <label className={labelCls}><ShieldCheck className="size-3" /> Autorização de envio</label>
              <div className="space-y-1.5 mt-1">
                {[
                  { v: 'autoriza', l: 'Autoriza comunicação', c: '#0DB57A' },
                  { v: 'nao_autoriza', l: 'Não autoriza', c: '#EF4444' },
                  { v: 'nao_informado', l: 'Não informado', c: '#8C8880' },
                ].map(o => (
                  <button key={o.v} type="button" onClick={() => setLgpd(o.v)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${lgpd === o.v ? 'bg-[#F7F6F3]' : 'hover:bg-[#F7F6F3]'}`}>
                    <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: lgpd === o.v ? o.c : '#C8C5BB' }}>
                      {lgpd === o.v && <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.c }} />}
                    </span>
                    <span style={{ color: lgpd === o.v ? o.c : '#8C8880' }}>{o.l}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#EAE8E1] p-3 flex flex-col justify-between">
              <label className={labelCls}>Status do cliente</label>
              <button type="button" onClick={() => setActive(!active)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F7F6F3] transition-all">
                <span className={`text-sm font-semibold ${active ? 'text-[#0DB57A]' : 'text-[#8C8880]'}`}>
                  {active ? 'Ativo' : 'Inativo'}
                </span>
                <span className={`relative w-10 h-5 rounded-full transition-colors ${active ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880] hover:text-[#2E2D29] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Cadastrar cliente</>}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
