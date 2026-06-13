'use client'

import { useState, useRef, useEffect } from 'react'
import { FUNIL_ETAPAS } from '@/lib/funil'
import { responderLead, atualizarLead } from '@/lib/actions/lead'
import {
  X, Send, Loader2, Phone, Mail, MapPin, Tag, Check, MessageCircle, DollarSign, Plus,
} from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'human'; content: string }
export type Lead = {
  id: string; name: string | null; phone: string; email: string | null
  origem: string | null; tags: string[] | null; notes: string | null
  funil_etapa: string | null; funil_valor: number | null; created_at: string
  conversaId: string | null; messages: Msg[]
}

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
const ORIGENS = ['Instagram', 'Facebook', 'Google', 'Indicação de amigo', 'Indicação médica', 'Passou em frente', 'Já era cliente', 'WhatsApp', 'Manual', 'Outro']

export function LeadDetalhe({ lead, onClose, onChange }: {
  lead: Lead
  onClose: () => void
  onChange: (id: string, patch: Partial<Lead>) => void
}) {
  // chat
  const [msgs, setMsgs] = useState<Msg[]>(lead.messages ?? [])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroChat, setErroChat] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  // info editável
  const [nome, setNome] = useState(lead.name ?? '')
  const [email, setEmail] = useState(lead.email ?? '')
  const [origem, setOrigem] = useState(lead.origem ?? '')
  const [valor, setValor] = useState(String(lead.funil_valor ?? ''))
  const [etapa, setEtapa] = useState(lead.funil_etapa ?? 'novo')
  const [tags, setTags] = useState<string[]>(lead.tags ?? [])
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [novaTag, setNovaTag] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => { fimRef.current?.scrollIntoView() }, [msgs.length])

  async function enviar() {
    if (!texto.trim()) return
    setEnviando(true); setErroChat(null)
    const t = texto.trim()
    const r = await responderLead(lead.id, t)
    setEnviando(false)
    if (r?.error) { setErroChat(r.error); return }
    setMsgs(m => [...m, { role: 'human', content: t }])
    setTexto('')
  }

  function addTag() {
    const t = novaTag.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setNovaTag('')
  }

  async function salvar() {
    setSalvando(true)
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
    await atualizarLead(lead.id, { name: nome, email, origem, valor: v, etapa, tags, notes })
    setSalvando(false); setSalvo(true); setTimeout(() => setSalvo(false), 2000)
    onChange(lead.id, { name: nome || null, email: email || null, origem: origem || null, funil_valor: v, funil_etapa: etapa, tags, notes: notes || null })
  }

  async function mudarEtapa(nova: string) {
    setEtapa(nova)
    await atualizarLead(lead.id, { etapa: nova })
    onChange(lead.id, { funil_etapa: nova })
  }

  const etapaInfo = FUNIL_ETAPAS.find(e => e.key === etapa) ?? FUNIL_ETAPAS[0]
  const inputCls = 'w-full h-10 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all'
  const labelCls = 'text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" style={{ background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#EAE8E1] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: etapaInfo.cor }}>
              {(nome || lead.phone)[0].toUpperCase()}
            </div>
            <div>
              <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{nome || 'Sem nome'}</p>
              <p className="text-xs text-[#8C8880]">{lead.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3]"><X className="size-5" /></button>
        </div>

        {/* Etapa (pipeline) */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#EAE8E1] overflow-x-auto shrink-0 bg-[#FAFAF9]">
          {FUNIL_ETAPAS.map(e => (
            <button key={e.key} onClick={() => mudarEtapa(e.key)}
              className="px-3 h-7 rounded-full text-[11px] font-bold whitespace-nowrap transition-all"
              style={etapa === e.key
                ? { background: e.cor, color: '#fff' }
                : { background: e.bg, color: e.cor }}>
              {e.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Chat */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-[#EAE8E1]">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ECE5DD]">
              {msgs.length === 0 && <p className="text-sm text-[#8C8880] text-center py-10">Nenhuma mensagem ainda.<br />Envie a primeira pelo campo abaixo.</p>}
              {msgs.map((m, i) => {
                const meu = m.role === 'assistant' || m.role === 'human'
                return (
                  <div key={i} className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      m.role === 'assistant' ? 'bg-[#1A56FF] text-white rounded-br-sm'
                      : m.role === 'human' ? 'bg-[#DCF8C6] text-[#1C1B18] rounded-br-sm'
                      : 'bg-white text-[#2E2D29] rounded-bl-sm'}`}>
                      {m.role === 'assistant' && <span className="text-[10px] opacity-80 block mb-0.5">🤖 IA</span>}
                      {m.content}
                    </div>
                  </div>
                )
              })}
              <div ref={fimRef} />
            </div>
            <div className="p-3 border-t border-[#EAE8E1] bg-white shrink-0">
              {erroChat && <p className="text-xs text-red-500 mb-1.5">{erroChat}</p>}
              <div className="flex items-center gap-2">
                <input value={texto} onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                  placeholder="Escreva uma mensagem…"
                  className="flex-1 h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#0DB57A]" />
                <button onClick={enviar} disabled={enviando || !texto.trim()}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-50" style={{ background: '#0DB57A' }}>
                  {enviando ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Painel de informações */}
          <div className="w-80 shrink-0 overflow-y-auto p-4 space-y-3.5">
            <p className="text-xs font-black text-[#1C1B18] uppercase tracking-wider">Informações do lead</p>

            <div>
              <label className={labelCls}>Valor da venda</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#0DB57A]" />
                <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className={`${inputCls} pl-9 font-bold text-[#0DB57A]`} />
              </div>
            </div>
            <div><label className={labelCls}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} /></div>
            <div>
              <label className={labelCls}>Telefone</label>
              <div className="flex gap-2">
                <input value={lead.phone} readOnly className={`${inputCls} flex-1`} />
                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '').startsWith('55') ? lead.phone.replace(/\D/g, '') : '55' + lead.phone.replace(/\D/g, '')}`} target="_blank"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[#0DB57A] border border-[#EAE8E1] hover:bg-[#E6F9F3]"><MessageCircle className="size-4" /></a>
              </div>
            </div>
            <div><label className={labelCls}><Mail className="size-3 inline mr-1" />E-mail</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} /></div>
            <div>
              <label className={labelCls}><MapPin className="size-3 inline mr-1" />Origem</label>
              <select value={origem} onChange={e => setOrigem(e.target.value)} className={inputCls}>
                <option value="">—</option>{ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Etiquetas */}
            <div>
              <label className={labelCls}><Tag className="size-3 inline mr-1" />Etiquetas</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#1A56FF] font-semibold">
                    {t}<button onClick={() => setTags(tags.filter(x => x !== t))}><X className="size-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input value={novaTag} onChange={e => setNovaTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Nova etiqueta" className={`${inputCls} h-9`} />
                <button onClick={addTag} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#1A56FF] border border-[#EAE8E1] hover:bg-[#EEF2FF] shrink-0"><Plus className="size-4" /></button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Observações</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anotações internas…"
                className="w-full px-3 py-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] resize-none" />
            </div>

            <button onClick={salvar} disabled={salvando}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
              {salvando ? <Loader2 className="size-4 animate-spin" /> : salvo ? <><Check className="size-4" /> Salvo!</> : 'Salvar informações'}
            </button>
            <p className="text-[10px] text-[#C8C5BB] text-center">Lead desde {new Date(lead.created_at).toLocaleDateString('pt-BR')} · valor atual {fmt(Number(lead.funil_valor ?? 0))}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
