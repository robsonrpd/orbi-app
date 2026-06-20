'use client'

import { X, Sparkles, Calendar, Link2, Palette } from 'lucide-react'

const updates = [
  {
    icon: Link2,
    data: 'Junho 2026',
    titulo: 'Link de agendamento público',
    desc: 'Agora você pode enviar um link direto pro seu cliente escolher o serviço, dia e horário — sem precisar ligar ou conversar no WhatsApp.',
  },
  {
    icon: Palette,
    data: 'Junho 2026',
    titulo: 'Agenda liberada para todos os ramos',
    desc: 'Lojas e varejo também ganharam acesso aos módulos de Agenda e Funcionamento.',
  },
  {
    icon: Sparkles,
    data: 'Junho 2026',
    titulo: 'Nova landing page',
    desc: 'Site institucional do Orbi renovado, com seções para cada tipo de negócio.',
  },
]

export function AtualizacoesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.6)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE8E1] shrink-0"
          style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A3A6E)' }}>
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="size-4.5" />
            <h2 className="text-sm font-bold">Atualizações do Orbi</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-4.5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {updates.map(u => (
            <div key={u.titulo} className="flex gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                <u.icon className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="flex items-center gap-1 text-[10px] font-bold text-[#8C8880] uppercase tracking-wider">
                  <Calendar className="size-3" /> {u.data}
                </p>
                <p className="text-sm font-bold text-[#1C1B18] mt-0.5">{u.titulo}</p>
                <p className="text-xs text-[#8C8880] mt-1 leading-relaxed">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
