import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { Bot, User, AlertTriangle, MessageSquare } from 'lucide-react'

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default async function ConversasPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const { data: conversations } = await service
    .from('conversations')
    .select('*, contacts(name, phone)')
    .eq('company_id', companyId)
    .order('last_message_at', { ascending: false })
    .limit(50)

  const all = conversations ?? []
  const byIA = all.filter(c => c.handled_by_ai && !c.escalated_at)
  const escalated = all.filter(c => c.escalated_at)
  const byHuman = all.filter(c => !c.handled_by_ai && !c.escalated_at)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Conversas" subtitle="Histórico de atendimentos via WhatsApp" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Respondidas pela IA', count: byIA.length, icon: Bot, color: 'text-[#1A56FF]', bg: 'bg-[#EEF2FF]' },
            { label: 'Escaladas para humano', count: escalated.length, icon: AlertTriangle, color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7]' },
            { label: 'Com atendimento humano', count: byHuman.length, icon: User, color: 'text-[#0DB57A]', bg: 'bg-[#E6F9F3]' },
          ].map(({ label, count, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-[#EAE8E1] p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`size-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{count}</p>
                <p className="text-xs text-[#8C8880]">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lista de conversas */}
        <div className="bg-white rounded-xl border border-[#EAE8E1]">
          <div className="px-5 py-4 border-b border-[#EAE8E1]">
            <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
              Todas as conversas
            </h2>
          </div>
          <div className="divide-y divide-[#EAE8E1]">
            {all.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <MessageSquare className="size-8 text-[#EAE8E1] mx-auto mb-2" />
                <p className="text-sm text-[#8C8880]">Nenhuma conversa registrada ainda.</p>
                <p className="text-xs text-[#C8C5BB] mt-1">As conversas aparecem aqui quando a IA responder no WhatsApp.</p>
              </div>
            ) : (
              all.map((conv: Record<string, unknown>) => {
                const contact = conv.contacts as { name?: string; phone?: string } | null
                const messages = (conv.messages as { role: string; content: string }[]) ?? []
                const lastMsg = messages[messages.length - 1]
                return (
                  <div key={conv.id as string} className="px-5 py-4 flex items-start justify-between hover:bg-[#F7F6F3] transition-colors cursor-pointer">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-sm font-bold text-[#1A56FF] shrink-0">
                        {(contact?.name ?? contact?.phone ?? '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-semibold text-[#1C1B18]">
                            {contact?.name ?? contact?.phone ?? '—'}
                          </p>
                          <span className="text-xs text-[#C8C5BB] shrink-0 ml-2">
                            {formatDate(conv.last_message_at as string)} · {formatTime(conv.last_message_at as string)}
                          </span>
                        </div>
                        {lastMsg && (
                          <p className="text-xs text-[#8C8880] truncate">
                            {lastMsg.role === 'assistant' ? '🤖 ' : ''}{lastMsg.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        conv.escalated_at
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : conv.handled_by_ai
                          ? 'bg-[#EEF2FF] text-[#1A56FF] border-[#1A56FF]/20'
                          : 'bg-[#E6F9F3] text-[#0DB57A] border-[#0DB57A]/20'
                      }`}>
                        {conv.escalated_at ? 'Escalada' : conv.handled_by_ai ? 'IA' : 'Humano'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
