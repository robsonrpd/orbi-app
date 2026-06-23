'use client'

import { useState, useRef, useEffect } from 'react'
import { FUNIL_ETAPAS } from '@/lib/funil'
import { responderLead, atualizarLead } from '@/lib/actions/lead'
import { setResponsavel, criarTarefa, toggleTarefa, excluirTarefa, criarAnotacao, excluirAnotacao, setQualificacao, setStatusNegociacao, addProdutoLead, delProdutoLead, enviarOrcamentoLead, enviarArquivoLead, enviarAudioLead } from '@/lib/actions/crm'
import {
  X, Send, Loader2, Mail, MapPin, Tag, Check, MessageCircle, DollarSign, Plus,
  UserCog, CheckSquare, Square, Calendar, Zap, StickyNote, Trash2, Star, ShoppingBag, FileText,
  Paperclip, Mic, Image as ImageIcon, Square as StopIcon,
} from 'lucide-react'

type Midia = { tipo: string; url: string; nome?: string }
type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: Midia; ts?: string }

function fmtHoraMsg(ts: string | undefined) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
type Tarefa = { id: string; titulo: string; vence_em: string | null; feito: boolean }
type Anotacao = { id: string; texto: string; created_at: string }
type Produto = { id: string; nome: string; quantidade: number; preco: number; desconto: number }
export type Lead = {
  id: string; name: string | null; phone: string; email: string | null
  origem: string | null; tags: string[] | null; notes: string | null
  funil_etapa: string | null; funil_valor: number | null; responsavel_id: string | null
  qualificacao: number | null; negociacao_status: string | null; lastMessageAt: string | null; created_at: string
  conversaId: string | null; messages: Msg[]; tarefas: Tarefa[]; anotacoes: Anotacao[]; produtos: Produto[]
}

const STATUS = [
  { key: 'aberta', label: 'Aberta', cor: '#1A56FF', bg: '#EEF2FF' },
  { key: 'vendida', label: 'Vendida', cor: '#0DB57A', bg: '#E6F9F3' },
  { key: 'pendente', label: 'Pendente', cor: '#F59E0B', bg: '#FEF3C7' },
  { key: 'perdida', label: 'Perdida', cor: '#EF4444', bg: '#FEF2F2' },
]
type Vendedor = { id: string; nome: string }
type MsgPronta = { id: string; titulo: string; texto: string }
type ProdLoja = { id: string; name: string; price: number }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function dataBR(s: string | null) { return s ? new Date(s.length <= 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '' }
const ORIGENS = ['Instagram', 'Facebook', 'Google', 'Indicação de amigo', 'Indicação médica', 'Passou em frente', 'Já era cliente', 'WhatsApp', 'Manual', 'Outro']

export function LeadDetalhe({ lead, onClose, onChange, vendedores, msgsProntas, produtosLoja }: {
  lead: Lead; onClose: () => void; onChange: (id: string, patch: Partial<Lead>) => void
  vendedores: Vendedor[]; msgsProntas: MsgPronta[]; produtosLoja: ProdLoja[]
}) {
  const [msgs, setMsgs] = useState<Msg[]>(lead.messages ?? [])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroChat, setErroChat] = useState<string | null>(null)
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

  // qualificação, status, produtos
  const [estrelas, setEstrelas] = useState(lead.qualificacao ?? 0)
  const [status, setStatus] = useState(lead.negociacao_status ?? 'aberta')
  const [produtos, setProdutos] = useState<Produto[]>(lead.produtos ?? [])
  const [pSel, setPSel] = useState(''); const [pNome, setPNome] = useState(''); const [pQtd, setPQtd] = useState('1'); const [pPreco, setPPreco] = useState(''); const [pDesc, setPDesc] = useState('')
  const [enviandoOrc, setEnviandoOrc] = useState(false)

  async function mudarEstrelas(n: number) { setEstrelas(n); await setQualificacao(lead.id, n) }
  async function mudarStatus(s: string) { setStatus(s); await setStatusNegociacao(lead.id, s); onChange(lead.id, { negociacao_status: s }) }
  async function addProduto() {
    if (!pNome.trim()) return
    const r = await addProdutoLead(lead.id, { nome: pNome, quantidade: parseFloat(pQtd) || 1, preco: parseFloat(pPreco.replace(',', '.')) || 0, desconto: parseFloat(pDesc.replace(',', '.')) || 0 })
    if (r?.produto) { setProdutos(ps => [...ps, r.produto as Produto]); setPSel(''); setPNome(''); setPQtd('1'); setPPreco(''); setPDesc('') }
  }
  async function delProduto(id: string) { setProdutos(ps => ps.filter(x => x.id !== id)); await delProdutoLead(id) }
  async function enviarOrc() { setEnviandoOrc(true); const r = await enviarOrcamentoLead(lead.id); setEnviandoOrc(false); if (!r?.error) setMsgs(m => [...m, { role: 'human', content: '📋 Orçamento enviado', ts: new Date().toISOString() }]) }
  const totalProdutos = produtos.reduce((s, p) => s + (Number(p.quantidade) * Number(p.preco) - Number(p.desconto)), 0)

  // salvar dados do lead (botão) — grava tudo de uma vez e atualiza o card
  async function salvar() {
    setSalvando(true)
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
    await atualizarLead(lead.id, { name: nome, email, origem, valor: v, tags })
    onChange(lead.id, { name: nome || null, email: email || null, origem: origem || null, funil_valor: v, tags } as Partial<Lead>)
    setSalvando(false); setSalvo(true); setTimeout(() => setSalvo(false), 1800)
  }

  // anexos + áudio
  const [menuOpen, setMenuOpen] = useState(false)
  const [subProntas, setSubProntas] = useState(false)
  const [anexando, setAnexando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function uploadBlob(file: Blob, nome: string): Promise<string | null> {
    const fd = new FormData(); fd.append('file', new File([file], nome, { type: file.type }))
    try { const r = await fetch('/api/upload', { method: 'POST', body: fd }); const d = await r.json(); return r.ok ? d.url : null } catch { return null }
  }

  async function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setMenuOpen(false); setAnexando(true)
    const url = await uploadBlob(f, f.name)
    if (url) {
      const tipo = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'document'
      const r = await enviarArquivoLead(lead.id, url, tipo, f.name)
      if (!r?.error) setMsgs(m => [...m, { role: 'human', content: tipo === 'image' ? '📷 Imagem' : tipo === 'video' ? '🎥 Vídeo' : `📎 ${f.name}`, ts: new Date().toISOString(), midia: { tipo, url, nome: f.name } }])
    }
    setAnexando(false); if (fileRef.current) fileRef.current.value = ''
  }

  async function toggleGravar() {
    if (gravando) { recRef.current?.stop(); return }
    setMenuOpen(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = ev => { if (ev.data.size) chunksRef.current.push(ev.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setGravando(false); setAnexando(true)
        const url = await uploadBlob(blob, `audio-${Date.now()}.webm`)
        if (url) { const r = await enviarAudioLead(lead.id, url); if (!r?.error) setMsgs(m => [...m, { role: 'human', content: '🎤 Áudio', ts: new Date().toISOString(), midia: { tipo: 'audio', url } }]) }
        setAnexando(false)
      }
      recRef.current = rec; rec.start(); setGravando(true)
    } catch { alert('Não foi possível acessar o microfone.') }
  }

  useEffect(() => { fimRef.current?.scrollIntoView() }, [msgs.length])

  async function enviar() {
    if (!texto.trim()) return
    setEnviando(true); setErroChat(null)
    const t = texto.trim()
    const r = await responderLead(lead.id, t)
    setEnviando(false)
    if (r?.error) { setErroChat(r.error); return }
    setMsgs(m => [...m, { role: 'human', content: t, ts: new Date().toISOString() }]); setTexto('')
  }

  function addTag() {
    const t = novaTag.trim(); if (!t || tags.includes(t)) { setNovaTag(''); return }
    const novas = [...tags, t]; setTags(novas); setNovaTag('')
  }
  function removerTag(t: string) { setTags(tags.filter(x => x !== t)) }
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center" style={{ background: 'rgba(10,15,30,0.55)' }}>
      <div className="w-full h-full bg-white shadow-2xl flex flex-col">
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
                      {m.midia?.tipo === 'image' && <img src={m.midia.url} alt="" className="rounded-lg max-w-full max-h-60 mb-1 cursor-pointer" onClick={() => window.open(m.midia!.url, '_blank')} />}
                      {m.midia?.tipo === 'video' && <video src={m.midia.url} controls className="rounded-lg max-w-full max-h-60 mb-1" />}
                      {m.midia?.tipo === 'audio' && <audio src={m.midia.url} controls className="max-w-full mb-1" />}
                      {m.midia?.tipo === 'document' && <a href={m.midia.url} target="_blank" className="flex items-center gap-1.5 underline mb-1"><Paperclip className="size-3.5" />{m.midia.nome || 'Documento'}</a>}
                      {(!m.midia || m.content !== '📷 Imagem' && m.content !== '🎥 Vídeo' && m.content !== '🎤 Áudio') && <span>{m.content}</span>}
                      {fmtHoraMsg(m.ts) && (
                        <span className={`block text-[10px] mt-1 text-right ${m.role === 'assistant' ? 'text-white/60' : 'text-[#8C8880]'}`}>
                          {fmtHoraMsg(m.ts)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={fimRef} />
            </div>
            <div className="p-3 border-t border-[#EAE8E1] bg-white shrink-0">
              {erroChat && <p className="text-xs text-red-500 mb-1.5">{erroChat}</p>}
              <input type="file" ref={fileRef} onChange={escolherArquivo} className="hidden" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" />
              <div className="flex items-center gap-2 relative">
                {/* Menu "+" */}
                <div className="relative">
                  <button onClick={() => setMenuOpen(o => !o)} title="Anexar"
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[#8C8880] border border-[#EAE8E1] hover:bg-[#F7F6F3]">
                    {anexando ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
                  </button>
                  {menuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-[#EAE8E1] rounded-xl shadow-2xl overflow-hidden z-20">
                      <button onClick={() => setSubProntas(s => !s)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#2E2D29] hover:bg-[#FEF9EE]"><Zap className="size-4 text-[#F59E0B]" /> Resposta rápida</button>
                      {subProntas && (
                        <div className="bg-[#FAFAF9] max-h-44 overflow-y-auto border-y border-[#F3F1EB]">
                          {msgsProntas.length === 0 ? <p className="text-[11px] text-[#C8C5BB] p-2 text-center">Nenhuma. Crie no funil.</p>
                            : msgsProntas.map(mp => (
                              <button key={mp.id} onClick={() => { setTexto(mp.texto); setMenuOpen(false); setSubProntas(false) }} className="w-full text-left px-3 py-1.5 hover:bg-white">
                                <p className="text-xs font-bold text-[#1C1B18]">{mp.titulo}</p><p className="text-[10px] text-[#8C8880] truncate">{mp.texto}</p>
                              </button>
                            ))}
                        </div>
                      )}
                      <button onClick={() => { setMenuOpen(false); fileRef.current?.click() }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#2E2D29] hover:bg-[#EEF2FF]"><ImageIcon className="size-4 text-[#1A56FF]" /> Foto / Vídeo</button>
                      <button onClick={() => { setMenuOpen(false); fileRef.current?.click() }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#2E2D29] hover:bg-[#EEF2FF]"><Paperclip className="size-4 text-[#8B5CF6]" /> Documento</button>
                      <button onClick={toggleGravar} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#2E2D29] hover:bg-[#E6F9F3]"><Mic className="size-4 text-[#0DB57A]" /> Gravar áudio</button>
                    </div>
                  )}
                </div>

                {gravando ? (
                  <div className="flex-1 h-11 px-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-500 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Gravando… toque em ■ para enviar
                  </div>
                ) : (
                  <input value={texto} onChange={e => setTexto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                    placeholder="Escreva uma mensagem…"
                    className="flex-1 h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#0DB57A]" />
                )}
                <button onClick={gravando ? toggleGravar : enviar} disabled={enviando || (!gravando && !texto.trim())}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-50" style={{ background: gravando ? '#EF4444' : '#0DB57A' }}>
                  {enviando ? <Loader2 className="size-5 animate-spin" /> : gravando ? <StopIcon className="size-5 fill-white" /> : <Send className="size-5" />}
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
              {/* Status da negociação */}
              <div>
                <label className={labelCls}>Status</label>
                <div className="grid grid-cols-4 gap-1">
                  {STATUS.map(s => (
                    <button key={s.key} onClick={() => mudarStatus(s.key)}
                      className="h-8 rounded-lg text-[11px] font-bold transition-all"
                      style={status === s.key ? { background: s.cor, color: '#fff' } : { background: s.bg, color: s.cor }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Qualificação */}
              <div>
                <label className={labelCls}>Qualificação</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => mudarEstrelas(n === estrelas ? 0 : n)}>
                      <Star className={`size-5 ${n <= estrelas ? 'fill-amber-400 text-amber-400' : 'text-[#EAE8E1]'}`} strokeWidth={1} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Produtos / mini-orçamento */}
            <div className="space-y-2 pt-1 border-t border-[#F3F1EB]">
              <div className="flex items-center justify-between">
                <p className={secTitle}><ShoppingBag className="size-3.5 text-[#1A56FF]" /> Produtos</p>
                {totalProdutos > 0 && <span className="text-xs font-black text-[#0DB57A]">{fmt(totalProdutos)}</span>}
              </div>
              {produtos.map(p => (
                <div key={p.id} className="group flex items-center gap-2 text-xs">
                  <span className="flex-1 text-[#2E2D29]">{Number(p.quantidade)}x {p.nome}{Number(p.desconto) > 0 ? ` (-${fmt(Number(p.desconto))})` : ''}</span>
                  <span className="font-semibold text-[#0DB57A]">{fmt(Number(p.quantidade) * Number(p.preco) - Number(p.desconto))}</span>
                  <button onClick={() => delProduto(p.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 className="size-3" /></button>
                </div>
              ))}
              <div className="grid grid-cols-12 gap-1">
                {produtosLoja.length > 0 ? (
                  <select value={pSel} onChange={e => { setPSel(e.target.value); const p = produtosLoja.find(x => x.id === e.target.value); if (p) { setPNome(p.name); setPPreco(String(p.price)) } else { setPNome('') } }}
                    className="col-span-12 h-9 px-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-xs outline-none">
                    <option value="">Escolher produto do estoque…</option>
                    {produtosLoja.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}
                  </select>
                ) : (
                  <input value={pNome} onChange={e => setPNome(e.target.value)} placeholder="Produto" className="col-span-12 h-9 px-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-xs outline-none" />
                )}
                <input value={pQtd} onChange={e => setPQtd(e.target.value)} type="number" min="1" placeholder="Qtd" className="col-span-3 h-9 px-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-xs outline-none" />
                <input value={pPreco} onChange={e => setPPreco(e.target.value)} placeholder="Preço" className="col-span-4 h-9 px-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-xs outline-none" />
                <input value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Desc." className="col-span-3 h-9 px-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-xs outline-none" />
                <button onClick={addProduto} disabled={!pNome.trim()} className="col-span-2 h-9 rounded-lg flex items-center justify-center text-[#1A56FF] border border-[#EAE8E1] hover:bg-[#EEF2FF] disabled:opacity-40"><Plus className="size-4" /></button>
              </div>
              {produtos.length > 0 && (
                <button onClick={enviarOrc} disabled={enviandoOrc}
                  className="w-full h-9 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-white" style={{ background: '#0DB57A' }}>
                  {enviandoOrc ? <Loader2 className="size-4 animate-spin" /> : <><FileText className="size-3.5" /> Enviar orçamento no WhatsApp</>}
                </button>
              )}
            </div>

            {/* Dados */}
            <div className="space-y-2.5 pt-1 border-t border-[#F3F1EB]">
              <div className="flex items-center justify-between">
                <p className={secTitle}>Dados</p>
              </div>
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
                  {tags.map(t => <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#1A56FF] font-semibold">{t}<button onClick={() => removerTag(t)}><X className="size-3" /></button></span>)}
                </div>
                <div className="flex gap-1.5">
                  <input value={novaTag} onChange={e => setNovaTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Nova etiqueta" className={`${inputCls} h-9`} />
                  <button onClick={addTag} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#1A56FF] border border-[#EAE8E1] hover:bg-[#EEF2FF] shrink-0"><Plus className="size-4" /></button>
                </div>
              </div>
              <button onClick={salvar} disabled={salvando}
                className="w-full h-10 rounded-lg bg-[#1A56FF] text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#1448d8] disabled:opacity-60">
                {salvo ? <><Check className="size-4" /> Salvo!</> : salvando ? 'Salvando…' : 'Salvar alterações'}
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
