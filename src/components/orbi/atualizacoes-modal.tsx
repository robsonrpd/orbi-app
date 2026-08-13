'use client'

import {
  X, Sparkles, Calendar, Link2, Palette, ScanLine, LayoutGrid,
  Send, Building2, MessageCircle,
} from 'lucide-react'

const updates = [
  {
    icon: ScanLine,
    data: 'Agosto 2026',
    titulo: 'Código de barras e etiquetas',
    desc: 'Bipe a peça no PDV e ela entra na venda sozinha — baixando do estoque e caindo no caixa. Para produtos sem etiqueta de fábrica, o Orbi cria o código e imprime as etiquetas em folha comum.',
  },
  {
    icon: LayoutGrid,
    data: 'Agosto 2026',
    titulo: 'Dashboard personalizável',
    desc: 'Escolha quais indicadores e seções aparecem na tela inicial e em que ordem. Use o botão Personalizar no topo do Dashboard.',
  },
  {
    icon: Building2,
    data: 'Julho 2026',
    titulo: 'Mais de uma empresa no mesmo login',
    desc: 'Tem mais de um negócio? Cadastre todos na mesma conta e alterne entre eles pelo menu lateral. Cada empresa fica com os dados totalmente separados.',
  },
  {
    icon: Send,
    data: 'Julho 2026',
    titulo: 'Envio em massa no WhatsApp',
    desc: 'Dispare uma mensagem para vários clientes com intervalo entre os envios e limite diário, para reduzir o risco de bloqueio do número.',
  },
  {
    icon: Palette,
    data: 'Julho 2026',
    titulo: 'Colunas do funil personalizáveis',
    desc: 'Renomeie, reordene, mude as cores e crie novas colunas no CRM, deixando o funil com a cara do seu processo de vendas.',
  },
  {
    icon: MessageCircle,
    data: 'Julho 2026',
    titulo: 'WhatsApp mais simples e estável',
    desc: 'A resposta automática por IA foi descontinuada. Agora todas as conversas chegam no painel para você e sua equipe responderem, e cada cliente vira um lead no CRM automaticamente.',
  },
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
