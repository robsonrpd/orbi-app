'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { listarConversas, obterMensagens, responderConversa, type ConversaResumo } from '@/lib/actions/conversas'
import { Search, Send, Loader2, Bot, MessageCircle } from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: { tipo: string; url: string; nome?: string } }

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

export function ConversasClient({ conversasIniciais }: { conversasIniciais: ConversaResumo[] }) {
  const [conversas, setConversas] = useState(conversasIniciais)
  const [selecionada, setSelecionada] = useState<string | null>(conversasIniciais[0]?.id ?? null)
  const [mensagens, setMensagens] = useState<Msg[]>([])
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregandoMsgs, setCarregandoMsgs] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  const carregarMensagens = useCallback((id: string) => {
    obterMensagens(id).then(setMensagens)
  }, [])

  useEffect(() => {
    if (!selecionada) return
    setCarregandoMsgs(true)
    obterMensagens(selecionada).then(m => { setMensagens(m); setCarregandoMsgs(false) })
  }, [selecionada])

  // Atualiza a lista e a conversa aberta periodicamente (mensagens novas via WhatsApp)
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
      setMensagens(prev => [...prev, { role: 'human', content: t }])
      listarConversas().then(setConversas)
    }
  }

  return (
    <div className="flex h-full rounded-2xl border border-[#EAE8E1] overflow-hidden bg-white">
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
      <div className="flex-1 flex flex-col" style={{ background: '#EDEDED' }}>
        {!ativa ? (
          <div className="flex-1 flex items-center justify-center text-[#8C8880] text-sm">
            <div className="text-center">
              <MessageCircle className="size-10 mx-auto mb-2 text-[#C8C5BB]" strokeWidth={1.5} />
              Selecione uma conversa
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
                      {m.midia ? (
                        m.midia.tipo === 'image'
                          ? <img src={m.midia.url} alt="" className="rounded-lg max-w-full mb-1" />
                          : <a href={m.midia.url} target="_blank" rel="noopener noreferrer" className="text-[#1A56FF] underline">📎 {m.midia.nome || m.midia.tipo}</a>
                      ) : null}
                      <p className="text-[#1C1B18] whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={fimRef} />
            </div>

            <div className="p-3 bg-white border-t border-[#EAE8E1] flex items-center gap-2 shrink-0">
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() } }}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-10 px-4 rounded-full border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all" />
              <button onClick={handleEnviar} disabled={enviando || !texto.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all"
                style={{ background: '#1A56FF' }}>
                {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
