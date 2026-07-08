'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  listarConversas, obterMensagens, responderConversa, enviarMidiaConversa, enviarAudioConversa,
  type ConversaResumo,
} from '@/lib/actions/conversas'
import {
  Search, Send, Loader2, Bot, MessageCircle, Smile, Plus, Mic, Square,
  FileText, Image as ImageIcon, Camera, Headphones, User, BarChart2, Calendar, Sticker, Book, Zap,
} from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: { tipo: string; url: string; nome?: string }; ts?: string }

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🎉', '❤️', '😊', '😢', '😮', '🔥', '✅', '👏', '🙌', '😅', '🤔', '😎', '💪', '📅', '⏰']

const ANEXO_ITENS = [
  { icon: FileText, label: 'Documento', cor: '#7E57C2', ativo: true, accept: '.pdf,.doc,.docx,.xls,.xlsx', mediatype: 'document' as const },
  { icon: ImageIcon, label: 'Fotos e vídeos', cor: '#1A56FF', ativo: true, accept: 'image/*,video/*', mediatype: 'image' as const },
  { icon: Camera, label: 'Câmera', cor: '#EC407A', ativo: false },
  { icon: Headphones, label: 'Áudio', cor: '#FF7043', ativo: false },
  { icon: User, label: 'Contato', cor: '#1A56FF', ativo: false },
  { icon: BarChart2, label: 'Enquete', cor: '#F9A825', ativo: false },
  { icon: Calendar, label: 'Evento', cor: '#EF5350', ativo: false },
  { icon: Sticker, label: 'Nova figurinha', cor: '#0DB57A', ativo: false },
  { icon: Book, label: 'Catálogo', cor: '#8D6E63', ativo: false },
  { icon: Zap, label: 'Resposta rápida', cor: '#FBC02D', ativo: false },
]

function achaConversaPorTel(tel: string | null, lista: ConversaResumo[]) {
  if (!tel) return null
  const chave = tel.replace(/\D/g, '').slice(-8)
  if (!chave) return null
  return lista.find(c => (c.numero ?? '').replace(/\D/g, '').slice(-8) === chave)?.id ?? null
}

function iniciais(nome: string) {
  return nome.trim().slice(0, 1).toUpperCase() || '?'
}

function fmtHora(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtData(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString()) return fmtHora(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

async function uploadArquivo(file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  return res.ok ? data.url : null
}

export function ConversasClient({ conversasIniciais }: { conversasIniciais: ConversaResumo[] }) {
  const searchParams = useSearchParams()
  const telParam = searchParams.get('tel')
  const [conversas, setConversas] = useState(conversasIniciais)
  const [selecionada, setSelecionada] = useState<string | null>(
    () => telParam ? achaConversaPorTel(telParam, conversasIniciais) : (conversasIniciais[0]?.id ?? null)
  )
  const [naoEncontrada, setNaoEncontrada] = useState(!!telParam && !achaConversaPorTel(telParam, conversasIniciais))
  const [mensagens, setMensagens] = useState<Msg[]>([])
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregandoMsgs, setCarregandoMsgs] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [anexoOpen, setAnexoOpen] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediatypeRef = useRef<'image' | 'document' | 'video'>('image')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const carregarMensagens = useCallback((id: string) => {
    obterMensagens(id).then(setMensagens)
  }, [])

  useEffect(() => {
    if (!selecionada) return
    setCarregandoMsgs(true)
    obterMensagens(selecionada).then(m => { setMensagens(m); setCarregandoMsgs(false) })
  }, [selecionada])

  useEffect(() => {
    const t = setInterval(() => {
      listarConversas().then(setConversas)
      if (selecionada) carregarMensagens(selecionada)
    }, 6000)
    return () => clearInterval(t)
  }, [selecionada, carregarMensagens])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const filtradas = conversas.filter(c => {
    const termo = busca.toLowerCase()
    return (c.contactName ?? c.numero).toLowerCase().includes(termo)
  })
  const ativa = conversas.find(c => c.id === selecionada) ?? null

  async function handleEnviar() {
    if (!selecionada || !texto.trim()) return
    setEnviando(true)
    const t = texto.trim()
    setTexto('')
    const res = await responderConversa(selecionada, t)
    setEnviando(false)
    if (!('error' in res)) {
      setMensagens(prev => [...prev, { role: 'human', content: t, ts: new Date().toISOString() }])
      listarConversas().then(setConversas)
    } else {
      setErro(res.error ?? 'Erro ao enviar.')
    }
  }

  function abrirSeletorArquivo(mediatype: 'image' | 'document' | 'video', accept: string) {
    mediatypeRef.current = mediatype
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
    setAnexoOpen(false)
  }

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selecionada) return
    setEnviando(true)
    const url = await uploadArquivo(file)
    if (!url) { setEnviando(false); setErro('Falha ao enviar o arquivo.'); return }
    const tipo = file.type.startsWith('video') ? 'video' : mediatypeRef.current
    const res = await enviarMidiaConversa(selecionada, { url, mediatype: tipo, fileName: file.name })
    setEnviando(false)
    if (!('error' in res)) {
      setMensagens(prev => [...prev, { role: 'human', content: file.name, ts: new Date().toISOString(), midia: { tipo, url, nome: file.name } }])
      listarConversas().then(setConversas)
    } else {
      setErro(res.error ?? 'Erro ao enviar.')
    }
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data)
      recorder.start()
      mediaRecorderRef.current = recorder
      setGravando(true)
    } catch {
      setErro('Não foi possível acessar o microfone.')
    }
  }

  async function pararEEnviarAudio() {
    const recorder = mediaRecorderRef.current
    if (!recorder || !selecionada) return
    setGravando(false)
    const blob: Blob = await new Promise(resolve => {
      recorder.onstop = () => resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
      recorder.stop()
      recorder.stream.getTracks().forEach(t => t.stop())
    })
    setEnviando(true)
    const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
    const url = await uploadArquivo(file)
    if (!url) { setEnviando(false); setErro('Falha ao enviar o áudio.'); return }
    const res = await enviarAudioConversa(selecionada, url)
    setEnviando(false)
    if (!('error' in res)) {
      setMensagens(prev => [...prev, { role: 'human', content: '🎤 Áudio', ts: new Date().toISOString(), midia: { tipo: 'audio', url } }])
      listarConversas().then(setConversas)
    } else {
      setErro(res.error ?? 'Erro ao enviar.')
    }
  }

  return (
    <div className="flex h-full rounded-2xl border border-[#EAE8E1] overflow-hidden bg-white">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleArquivoSelecionado} />

      {/* Lista de conversas */}
      <div className="w-[320px] shrink-0 border-r border-[#EAE8E1] flex flex-col bg-[#F7F6F3]">
        <div className="p-3 border-b border-[#EAE8E1]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conversa..."
              className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-[#EAE8E1] bg-white outline-none focus:border-[#1A56FF] transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtradas.length === 0 && (
            <p className="text-sm text-[#8C8880] text-center py-10 px-4">Nenhuma conversa ainda. Quando um cliente mandar mensagem no WhatsApp, ela aparece aqui.</p>
          )}
          {filtradas.map(c => {
            const nome = c.contactName ?? c.numero
            const ativo = c.id === selecionada
            return (
              <button key={c.id} onClick={() => setSelecionada(c.id)}
                className={`w-full flex items-start gap-2.5 px-3 py-3 border-b border-[#EAE8E1] text-left transition-colors ${ativo ? 'bg-white' : 'hover:bg-white/60'}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: '#1A56FF' }}>
                  {iniciais(nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#1C1B18] truncate">{nome}</p>
                    <span className="text-[10px] text-[#8C8880] shrink-0">{fmtData(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-[#8C8880] truncate mt-0.5">{c.ultimaMensagem || 'Sem mensagens'}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col relative" style={{ background: '#EDEDED' }}>
        {!ativa ? (
          <div className="flex-1 flex items-center justify-center text-[#8C8880] text-sm">
            <div className="text-center max-w-xs px-4">
              <MessageCircle className="size-10 mx-auto mb-2 text-[#C8C5BB]" strokeWidth={1.5} />
              {naoEncontrada ? 'Nenhuma conversa de WhatsApp com esse cliente ainda.' : 'Selecione uma conversa'}
            </div>
          </div>
        ) : (
          <>
            <div className="h-14 bg-white border-b border-[#EAE8E1] flex items-center gap-2.5 px-4 shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: '#1A56FF' }}>
                {iniciais(ativa.contactName ?? ativa.numero)}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1C1B18]">{ativa.contactName ?? ativa.numero}</p>
                <p className="text-xs text-[#8C8880]">{ativa.numero}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {carregandoMsgs && (
                <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-[#1A56FF]" /></div>
              )}
              {!carregandoMsgs && mensagens.map((m, i) => {
                const minha = m.role === 'assistant' || m.role === 'human'
                return (
                  <div key={i} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] rounded-xl px-3.5 py-2 text-sm shadow-sm"
                      style={{ background: minha ? (m.role === 'assistant' ? '#D9FDD3' : '#DCF8C6') : '#FFFFFF' }}>
                      {m.role === 'assistant' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#0DB57A] mb-0.5">
                          <Bot className="size-3" /> IA
                        </span>
                      )}
                      {m.midia && m.midia.tipo === 'image' && <img src={m.midia.url} alt="" className="rounded-lg max-w-full mb-1" />}
                      {m.midia && m.midia.tipo === 'video' && <video src={m.midia.url} controls className="rounded-lg max-w-full mb-1" />}
                      {m.midia && m.midia.tipo === 'audio' && <audio src={m.midia.url} controls className="mb-1" />}
                      {m.midia && m.midia.tipo === 'document' && (
                        <a href={m.midia.url} target="_blank" rel="noopener noreferrer" className="text-[#1A56FF] underline">📎 {m.midia.nome || 'Documento'}</a>
                      )}
                      <p className="text-[#1C1B18] whitespace-pre-wrap">{m.content}</p>
                      {m.ts && (
                        <span className={`block text-[10px] mt-1 text-right ${minha ? 'text-[#3A6B2E]' : 'text-[#8C8880]'}`}>
                          {fmtHora(m.ts)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={fimRef} />
            </div>

            {erro && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-1.5 shadow"
                onClick={() => setErro(null)}>
                {erro}
              </div>
            )}

            {emojiOpen && (
              <div className="absolute bottom-16 left-3 bg-white rounded-xl shadow-xl border border-[#EAE8E1] p-3 grid grid-cols-5 gap-1.5 z-20">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setTexto(t => t + e); setEmojiOpen(false) }}
                    className="text-xl hover:bg-[#F7F6F3] rounded-lg p-1.5 transition-colors">{e}</button>
                ))}
              </div>
            )}

            {anexoOpen && (
              <div className="absolute bottom-16 left-3 bg-white rounded-xl shadow-xl border border-[#EAE8E1] py-1.5 w-56 z-20">
                {ANEXO_ITENS.map(item => (
                  <button key={item.label}
                    onClick={() => item.ativo && abrirSeletorArquivo(item.mediatype!, item.accept!)}
                    disabled={!item.ativo}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-[#2E2D29] hover:bg-[#F7F6F3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <item.icon className="size-4.5" style={{ color: item.cor }} strokeWidth={1.5} />
                    {item.label}
                    {!item.ativo && <span className="text-[10px] text-[#C8C5BB] ml-auto">em breve</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 bg-white border-t border-[#EAE8E1] flex items-center gap-1.5 shrink-0">
              <button onClick={() => { setAnexoOpen(o => !o); setEmojiOpen(false) }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3] transition-colors shrink-0">
                <Plus className="size-5" />
              </button>
              <button onClick={() => { setEmojiOpen(o => !o); setAnexoOpen(false) }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3] transition-colors shrink-0">
                <Smile className="size-5" />
              </button>
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() } }}
                placeholder={gravando ? 'Gravando áudio...' : 'Digite uma mensagem...'}
                disabled={gravando}
                className="flex-1 h-10 px-4 rounded-full border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all disabled:opacity-60" />

              {texto.trim() ? (
                <button onClick={handleEnviar} disabled={enviando}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all"
                  style={{ background: '#1A56FF' }}>
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              ) : (
                <button onClick={gravando ? pararEEnviarAudio : iniciarGravacao} disabled={enviando}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all"
                  style={{ background: gravando ? '#EF4444' : '#1A56FF' }}>
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : gravando ? <Square className="size-4" /> : <Mic className="size-4" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
