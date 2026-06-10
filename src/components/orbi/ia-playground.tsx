'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string; escalou?: boolean }

export function IAPlayground({ aiName }: { aiName: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    const novasMsgs: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(novasMsgs)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: novasMsgs }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao responder.'); setLoading(false); return }
      setMessages(m => [...m, { role: 'assistant', content: data.resposta, escalou: data.escalou }])
    } catch {
      setError('Erro de conexão.')
    }
    setLoading(false)
  }

  const sugestoes = [
    'Vocês fazem exame de vista?',
    'Quanto custa uma armação?',
    'Qual o horário de funcionamento?',
    'Meu óculos quebrou, vocês consertam?',
  ]

  return (
    <div className="rounded-2xl border border-[#EAE8E1] bg-white overflow-hidden flex flex-col" style={{ height: '600px' }}>
      {/* Header estilo WhatsApp */}
      <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="size-5 text-white" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{aiName}</p>
          <p className="text-xs text-white/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0DB57A]" /> Simulação — teste como a IA responde
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setError(null) }}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors">
            <RefreshCw className="size-3.5" /> Limpar
          </button>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ background: '#F0F2F5' }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
              <Sparkles className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1C1B18]">Converse com a sua IA</p>
              <p className="text-xs text-[#8C8880] mt-1 max-w-xs">Digite como se fosse um cliente. A IA responde com base no contexto que você configurou.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {sugestoes.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="px-3 py-1.5 rounded-full text-xs border border-[#EAE8E1] bg-white text-[#8C8880] hover:border-[#1A56FF] hover:text-[#1A56FF] transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#1A56FF] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-3.5 text-white" strokeWidth={1.5} />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${m.role === 'user' ? 'bg-[#1A56FF] text-white rounded-br-sm' : 'bg-white text-[#1C1B18] rounded-bl-sm border border-[#EAE8E1]'}`}>
                {m.escalou && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#F59E0B] mb-1 uppercase tracking-wide" style={{ fontFamily: 'Barlow, sans-serif' }}>
                    <AlertTriangle className="size-3" /> Escalaria para humano
                  </div>
                )}
                <p className="text-sm leading-relaxed">{m.content}</p>
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[#EAE8E1] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="size-3.5 text-[#8C8880]" strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-[#1A56FF] flex items-center justify-center shrink-0">
              <Bot className="size-3.5 text-white" strokeWidth={1.5} />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm border border-[#EAE8E1] px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8C5BB] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8C5BB] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8C5BB] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="px-5 py-2.5 bg-red-50 border-t border-red-100 text-red-600 text-xs flex items-center gap-2">
          <AlertTriangle className="size-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={send} className="p-4 border-t border-[#EAE8E1] flex items-center gap-2 shrink-0 bg-white">
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Digite uma mensagem como cliente..."
          className="flex-1 h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] focus:bg-white transition-all placeholder:text-[#C8C5BB]" />
        <button type="submit" disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-40"
          style={{ background: '#1A56FF', boxShadow: '0 4px 12px rgba(26,86,255,0.35)' }}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  )
}
