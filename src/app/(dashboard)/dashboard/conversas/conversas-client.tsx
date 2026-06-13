'use client'

import { useState } from 'react'
import { Bot, User, AlertTriangle, MessageSquare, X, MessageCircle } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }
type Conversa = {
  id: string
  numero: string | null
  messages: Msg[] | null
  handled_by_ai: boolean
  escalated_at: string | null
  last_message_at: string
  contacts: { name?: string | null; phone?: string | null } | null
}

function formatTime(s: string) { return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function formatDate(s: string) { return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
function waLink(phone: string) { const d = (phone || '').replace(/\D/g, ''); return `https://wa.me/${d.startsWith('55') ? d : '55' + d}` }

export function ConversasClient({ conversas }: { conversas: Conversa[] }) {
  const [aberta, setAberta] = useState<Conversa | null>(null)

  const byIA = conversas.filter(c => c.handled_by_ai && !c.escalated_at)
  const escalated = conversas.filter(c => c.escalated_at)
  const byHuman = conversas.filter(c => !c.handled_by_ai && !c.escalated_at)

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Respondidas pela IA', count: byIA.length, icon: Bot, color: 'text-[#1A56FF]', bg: 'bg-[#EEF2FF]' },
          { label: 'Escaladas para humano', count: escalated.length, icon: AlertTriangle, color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7]' },
          { label: 'Aguardando atendimento', count: byHuman.length, icon: User, color: 'text-[#0DB57A]', bg: 'bg-[#E6F9F3]' },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#EAE8E1] p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}><Icon className={`size-5 ${color}`} /></div>
            <div>
              <p className="text-2xl font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{count}</p>
              <p className="text-xs text-[#8C8880]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-[#EAE8E1]">
        <div className="px-5 py-4 border-b border-[#EAE8E1]">
          <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Todas as conversas</h2>
        </div>
        <div className="divide-y divide-[#EAE8E1]">
          {conversas.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <MessageSquare className="size-8 text-[#EAE8E1] mx-auto mb-2" />
              <p className="text-sm text-[#8C8880]">Nenhuma conversa registrada ainda.</p>
              <p className="text-xs text-[#C8C5BB] mt-1">As conversas aparecem aqui quando alguém falar no WhatsApp.</p>
            </div>
          ) : conversas.map(conv => {
            const nome = conv.contacts?.name ?? conv.contacts?.phone ?? conv.numero ?? '—'
            const msgs = conv.messages ?? []
            const last = msgs[msgs.length - 1]
            return (
              <div key={conv.id} onClick={() => setAberta(conv)}
                className="px-5 py-4 flex items-start justify-between hover:bg-[#F7F6F3] transition-colors cursor-pointer">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-sm font-bold text-[#1A56FF] shrink-0">
                    {nome[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-[#1C1B18]">{nome}</p>
                      <span className="text-xs text-[#C8C5BB] shrink-0 ml-2">{formatDate(conv.last_message_at)} · {formatTime(conv.last_message_at)}</span>
                    </div>
                    {last && <p className="text-xs text-[#8C8880] truncate">{last.role === 'assistant' ? '🤖 ' : ''}{last.content}</p>}
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${conv.escalated_at ? 'bg-amber-50 text-amber-600 border-amber-200' : conv.handled_by_ai ? 'bg-[#EEF2FF] text-[#1A56FF] border-[#1A56FF]/20' : 'bg-[#E6F9F3] text-[#0DB57A] border-[#0DB57A]/20'}`}>
                    {conv.escalated_at ? 'Escalada' : conv.handled_by_ai ? 'IA' : 'Aguardando'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal thread */}
      {aberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE8E1]">
              <div>
                <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{aberta.contacts?.name ?? aberta.numero}</p>
                <p className="text-xs text-[#8C8880]">{aberta.contacts?.phone ?? aberta.numero}</p>
              </div>
              <div className="flex items-center gap-2">
                {aberta.numero && <a href={waLink(aberta.numero)} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#0DB57A] hover:bg-[#E6F9F3]"><MessageCircle className="size-4" /></a>}
                <button onClick={() => setAberta(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3]"><X className="size-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F0F2F5]">
              {(aberta.messages ?? []).map((m, i) => (
                <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.role === 'assistant' ? 'bg-[#1A56FF] text-white rounded-br-sm' : 'bg-white text-[#2E2D29] border border-[#EAE8E1] rounded-bl-sm'}`}>
                    {m.role === 'assistant' && <span className="text-[10px] opacity-70 block mb-0.5">🤖 Assistente</span>}
                    {m.content}
                  </div>
                </div>
              ))}
              {(aberta.messages ?? []).length === 0 && <p className="text-sm text-[#C8C5BB] text-center py-8">Sem mensagens.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
