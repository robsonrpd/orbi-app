'use client'

import { useState, useRef, useEffect } from 'react'
import { FUNIL_ETAPAS } from '@/lib/funil'
import { responderLead, atualizarLead } from '@/lib/actions/lead'
import { setResponsavel, criarTarefa, toggleTarefa, excluirTarefa, criarAnotacao, excluirAnotacao } from '@/lib/actions/crm'
import {
  X, Send, Loader2, Mail, MapPin, Tag, Check, MessageCircle, DollarSign, Plus,
  UserCog, CheckSquare, Square, Calendar, Zap, StickyNote, Trash2,
} from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'human'; content: string }
type Tarefa = { id: string; titulo: string; vence_em: string | null; feito: boolean }
type Anotacao = { id: string; texto: string; created_at: string }
export type Lead = {
  id: string; name: string | null; phone: string; email: string | null
  origem: string | null; tags: string[] | null; notes: string | null
  funil_etapa: string | null; funil_valor: number | null; responsavel_id: string | null; created_at: string
  conversaId: string | null; messages: Msg[]; tarefas: Tarefa[]; anotacoes: Anotacao[]
}
type Vendedor = { id: string; nome: string }
type MsgPronta = { id: string; titulo: string; texto: string }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function dataBR(s: string | null) { return s ? new Date(s.length <= 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '' }
const ORIGENS = ['Instagram', 'Facebook', 'Google', 'Indicação de amigo', 'Indicação médica', 'Passou em frente', 'Já era cliente', 'WhatsApp', 'Manual', 'Outro']

export function LeadDetalhe({ lead, onClose, onChange, vendedores, msgsProntas }: {
  lead: Lead; onClose: () => void; onChange: (id: string, patch: Partial<Lead>) => void
  vendedores: Vendedor[]; msgsProntas: MsgPronta[]
}) {
  const [msgs, setMsgs] = useState<Msg[]>(lead.messages ?? [])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroChat, setErroChat] = useState<string | null>(null)
  const [prontasOpen, setProntasOpen] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  const [nome, setNome] = useState(lead.name ?? '')
  const [email, setEmail] = useState(lead.email ?? '')
  const [origem, setOrigem] = useState(lead.origem ?? '')
  const [valor, setValor] = useState(String(lead.funil_valor ?? ''))
  const [etapa, setEtapa] = useState(lead.funil_etapa ?? 'novo')
  const [tags, setTags] = useState<string[]>(lead.tags ?? [])
  const [novaTag, setNovaTag] = useState('')
  const [responsavel, setResp] = useState(lead.responsavel_id ?? '')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  // tarefas e anotações
  const [tarefas, setTarefas] = useState<Tarefa[]>(lead.tarefas ?? [])
  const [tTit, setTTit] = useState(''); const [tData, setTData] = useState('')
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>(lead.anotacoes ?? [])
  const [anot, setAnot] = useState('')

  useEffect(() => { fimRef.current?.scrollIntoView() }, [msgs.length])

  async function enviar() {
    if (!texto.trim()) return
    setEnviando(true); setErroChat(null)
    const t = texto.trim()
    const r = await responderLead(lead.id, t)
    setEnviando(false)
    if (r?.error) { setErroChat(r.error); return }
    setMsgs(m => [...m, { role: 'human', content: t }]); setTexto('')
  }

  function addTag() { const t = novaTag.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setNovaTag('') }

  async function salvar() {
    setSalvando(true)
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
    await atualizarLead(lead.id, { name: nome, email, origem, valor: v, etapa, tags })
    setSalvando(false); setSalvo(true); setTimeout(() => setSalvo(false), 2000)
    onChange(lead.id, { name: nome || null, email: email || null, origem: origem || null, funil_valor: v, funil_etapa: etapa, tags })
  }
  async function mudarEtapa(n: string) { setEtapa(n); await atualizarLead(lead.id, { etapa: n }); onChange(lead.id, { funil_etapa: n }) }
  async function mudarResp(id: string) { setResp(id); await setResponsavel(lead.id, id || null) }

  async function addTarefa() {
    if (!tTit.trim()) return
    const r = await criarTarefa(lead.id, tTit, tData || null)
    if (r?.tarefa) { setTarefas(ts => [...ts, r.tarefa as Tarefa]); setTTit(''); setTData('') }
  }
  async function togTarefa(t: Tarefa) { setTarefas(ts => ts.map(x => x.id === t.id ? { ...x, feito: !x.feito } : x)); await toggleTarefa(t.id, !t.feito) }
  async function delTarefa(id: string) { setTarefas(ts => ts.filter(x => x.id !== id)); await excluirTarefa(id) }

  async function addAnotacao() {
    if (!anot.trim()) return
    const r = await criarAnotacao(lead.id, anot)
    if (r?.anotacao) { setAnotacoes(a => [r.anotacao as Anotacao, ...a]); setAnot('') }
  }
  async function delAnotacao(id: string) { setAnotacoes(a => a.filter(x => x.id !== id)); await excluirAnotacao(id) }

  const etapaInfo = FUNIL_ETAPAS.find(e => e.key === etapa) ?? FUNIL_ETAPAS[0]
  const inputCls = 'w-full h-10 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all'
  const labelCls = 'text-[10px] font-bold text-[#8C8880] uppercase tracking-wider block mb-1'
  const secTitle = 'text-[11px] font-black text-[#1C1B18] uppercase tracking-wider flex items-center gap-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" style={{ background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col">
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

        {/* Pipeline */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#EAE8E1] overflow-x-auto shrink-0 bg-[#FAFAF9]">
          {FUNIL_ETAPAS.map(e => (
            <button key={e.key} onClick={() => mudarEtapa(e.key)}
              className="px-3 h-7 rounded-full text-[11px] font-bold whitespace-nowrap transition-all"
              style={etapa === e.key ? { background: e.cor, color: '#fff' } : { background: e.bg, color: e.cor }}>
              {e.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Chat */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-[#EAE8E1]">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ECE5DD]">
              {msgs.length === 0 && <p className="text-sm text-[#8C8880] text-center py-10">Nenhuma mensagem ainda.</p>}
              {msgs.map((m, i) => {
                const meu = m.role === 'assistant' || m.role === 'human'
                return (
                  <div key={i} className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.role === 'assistant' ? 'bg-[#1A56FF] text-white rounded-br-sm' : m.role === 'human' ? 'bg-[#DCF8C6] text-[#1C1B18] rounded-br-sm' : 'bg-white text-[#2E2D29] rounded-bl-sm'}`}>
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
              <div className="flex items-center gap-2 relative">
                {/* Mensagens prontas */}
                <div className="relative">
                  <button onClick={() => setProntasOpen(o => !o)} title="Mensagens prontas"
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[#F59E0B] border border-[#EAE8E1] hover:bg-[#FEF3C7]"><Zap className="size-5" /></button>
                  {prontasOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-[#EAE8E1] rounded-xl shadow-2xl overflow-hidden z-10 max-h-64 overflow-y-auto">
                      {msgsProntas.length === 0 ? (
                        <p className="text-xs text-[#C8C5BB] p-3 text-center">Nenhuma mensagem pronta.<br />Crie em Parâmetros.</p>
                      ) : msgsProntas.map(mp => (
                        <button key={mp.id} onClick={() => { setTexto(mp.texto); setProntasOpen(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-[#FEF9EE] border-b border-[#F3F1EB]">
                          <p className="text-xs font-bold text-[#1C1B18]">{mp.titulo}</p>
                          <p className="text-[11px] text-[#8C8880] truncate">{mp.texto}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

          {/* Painel */}
          <div className="w-[340px] shrink-0 overflow-y-auto p-4 space-y-4">
            {/* Negociação */}
            <div className="space-y-2.5">
              <p className={secTitle}><DollarSign className="size-3.5 text-[#0DB57A]" /> Negociação</p>
              <div>
                <label className={labelCls}>Valor da venda</label>
                <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className={`${inputCls} font-bold text-[#0DB57A]`} />
              </div>
              <div>
                <label className={labelCls}><UserCog className="size-3 inline mr-1" />Responsável</label>
                <select value={responsavel} onChange={e => mudarResp(e.target.value)} className={inputCls}>
                  <option value="">— Ninguém</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Dados */}
            <div className="space-y-2.5 pt-1 border-t border-[#F3F1EB]">
              <div><label className={labelCls}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className={labelCls}>Telefone</label><input value={lead.phone} readOnly className={inputCls} /></div>
                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '').startsWith('55') ? lead.phone.replace(/\D/g, '') : '55' + lead.phone.replace(/\D/g, '')}`} target="_blank"
                  className="self-end w-10 h-10 rounded-lg flex items-center justify-center text-[#0DB57A] border border-[#EAE8E1] hover:bg-[#E6F9F3]"><MessageCircle className="size-4" /></a>
              </div>
              <div><label className={labelCls}><Mail className="size-3 inline mr-1" />E-mail</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} /></div>
              <div><label className={labelCls}><MapPin className="size-3 inline mr-1" />Origem</label>
                <select value={origem} onChange={e => setOrigem(e.target.value)} className={inputCls}><option value="">—</option>{ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
              <div>
                <label className={labelCls}><Tag className="size-3 inline mr-1" />Etiquetas</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {tags.map(t => <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#1A56FF] font-semibold">{t}<button onClick={() => setTags(tags.filter(x => x !== t))}><X className="size-3" /></button></span>)}
                </div>
                <div className="flex gap-1.5">
                  <input value={novaTag} onChange={e => setNovaTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Nova etiqueta" className={`${inputCls} h-9`} />
                  <button onClick={addTag} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#1A56FF] border border-[#EAE8E1] hover:bg-[#EEF2FF] shrink-0"><Plus className="size-4" /></button>
                </div>
              </div>
              <button onClick={salvar} disabled={salvando} className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
                {salvando ? <Loader2 className="size-4 animate-spin" /> : salvo ? <><Check className="size-4" /> Salvo!</> : 'Salvar dados'}
              </button>
            </div>

            {/* Tarefas */}
            <div className="space-y-2 pt-1 border-t border-[#F3F1EB]">
              <p className={secTitle}><CheckSquare className="size-3.5 text-[#F59E0B]" /> Tarefas</p>
              {tarefas.map(t => (
                <div key={t.id} className="flex items-center gap-2 group">
                  <button onClick={() => togTarefa(t)}>{t.feito ? <CheckSquare className="size-4 text-[#0DB57A]" /> : <Square className="size-4 text-[#C8C5BB]" />}</button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${t.feito ? 'line-through text-[#C8C5BB]' : 'text-[#2E2D29]'}`}>{t.titulo}</p>
                    {t.vence_em && <p className="text-[10px] text-[#F59E0B] flex items-center gap-0.5"><Calendar className="size-2.5" /> {dataBR(t.vence_em)}</p>}
                  </div>
                  <button onClick={() => delTarefa(t.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input value={tTit} onChange={e => setTTit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTarefa() }} placeholder="Ex: Ligar para o cliente" className={`${inputCls} h-9`} />
                <input value={tData} onChange={e => setTData(e.target.value)} type="date" className="w-32 h-9 px-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-xs outline-none" />
                <button onClick={addTarefa} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#F59E0B] border border-[#EAE8E1] hover:bg-[#FEF3C7] shrink-0"><Plus className="size-4" /></button>
              </div>
            </div>

            {/* Anotações */}
            <div className="space-y-2 pt-1 border-t border-[#F3F1EB]">
              <p className={secTitle}><StickyNote className="size-3.5 text-[#8B5CF6]" /> Anotações</p>
              <div className="flex gap-1.5">
                <input value={anot} onChange={e => setAnot(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addAnotacao() }} placeholder="Nova anotação…" className={`${inputCls} h-9`} />
                <button onClick={addAnotacao} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8B5CF6] border border-[#EAE8E1] hover:bg-[#F5F3FF] shrink-0"><Plus className="size-4" /></button>
              </div>
              {anotacoes.map(a => (
                <div key={a.id} className="group bg-[#FAF9F6] rounded-lg p-2 border border-[#F0EFEA]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-[#2E2D29] flex-1">{a.texto}</p>
                    <button onClick={() => delAnotacao(a.id)} className="opacity-0 group-hover:opacity-100 text-red-400 shrink-0"><Trash2 className="size-3" /></button>
                  </div>
                  <p className="text-[10px] text-[#C8C5BB] mt-0.5">{new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-[#C8C5BB] text-center pt-2">Lead desde {new Date(lead.created_at).toLocaleDateString('pt-BR')} · {fmt(Number(lead.funil_valor ?? 0))}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
