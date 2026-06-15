import { Users, Calendar, DollarSign, TrendingUp, Bell, Search } from 'lucide-react'

const kpis = [
  { icon: DollarSign, label: 'Faturamento (mês)', value: 'R$ 18.420', color: '#1A56FF' },
  { icon: Users, label: 'Clientes ativos', value: '347', color: '#0DB57A' },
  { icon: Calendar, label: 'Agendamentos hoje', value: '12', color: '#8B5CF6' },
  { icon: TrendingUp, label: 'Ticket médio', value: 'R$ 312', color: '#F59E0B' },
]

const bars = [40, 65, 50, 80, 60, 95, 75]

export function LaptopMockup() {
  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      {/* Tela */}
      <div className="rounded-t-2xl border border-[#2A2F45] bg-[#0D1226] p-2 sm:p-3 shadow-2xl">
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>

        <div className="rounded-lg overflow-hidden bg-[#F7F6F3] flex" style={{ aspectRatio: '16 / 9.5' }}>
          {/* Sidebar */}
          <div className="hidden sm:flex flex-col items-center gap-4 w-12 sm:w-14 py-4 shrink-0"
            style={{ background: 'linear-gradient(180deg, #0A0F1E 0%, #0D1635 100%)' }}>
            <div className="w-7 h-7 rounded-lg" style={{ background: '#1A56FF' }} />
            {[Search, Users, Calendar, DollarSign, TrendingUp].map((Icon, i) => (
              <Icon key={i} className="size-4 text-white/40" strokeWidth={1.5} />
            ))}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 p-3 sm:p-5 overflow-hidden">
            {/* Topbar */}
            <div className="flex items-center justify-between mb-3 sm:mb-5">
              <div>
                <p className="text-[10px] sm:text-xs text-[#8C8880]">Bom dia,</p>
                <p className="text-xs sm:text-base font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Sua Ótica</p>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-[#8C8880]" strokeWidth={1.5} />
                <div className="w-7 h-7 rounded-full" style={{ background: '#1A56FF' }} />
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-5">
              {kpis.map(k => (
                <div key={k.label} className="rounded-lg sm:rounded-xl bg-white border border-[#EAE8E1] p-2 sm:p-3">
                  <k.icon className="size-3.5 sm:size-4 mb-1 sm:mb-2" style={{ color: k.color }} strokeWidth={1.5} />
                  <p className="text-[11px] sm:text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{k.value}</p>
                  <p className="text-[8px] sm:text-[10px] text-[#8C8880] leading-tight mt-0.5 line-clamp-1">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Gráfico + lista */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="col-span-2 rounded-lg sm:rounded-xl bg-white border border-[#EAE8E1] p-2 sm:p-3">
                <p className="text-[9px] sm:text-[11px] font-bold text-[#1C1B18] mb-2 sm:mb-3" style={{ fontFamily: 'Barlow, sans-serif', letterSpacing: '1px' }}>
                  EVOLUÇÃO DE VENDAS
                </p>
                <div className="flex items-end gap-1.5 sm:gap-2 h-12 sm:h-20">
                  {bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm sm:rounded-t-md"
                      style={{ height: `${h}%`, background: 'linear-gradient(180deg, #1A56FF 0%, #93AAFF 100%)' }} />
                  ))}
                </div>
              </div>
              <div className="rounded-lg sm:rounded-xl bg-white border border-[#EAE8E1] p-2 sm:p-3 space-y-1.5 sm:space-y-2.5">
                <p className="text-[9px] sm:text-[11px] font-bold text-[#1C1B18] mb-1" style={{ fontFamily: 'Barlow, sans-serif', letterSpacing: '1px' }}>
                  AGENDA
                </p>
                {['09:00', '10:30', '14:00'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0DB57A' }} />
                    <span className="text-[9px] sm:text-[11px] text-[#2E2D29]">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base do notebook */}
      <div className="h-3 sm:h-4 rounded-b-xl mx-4 sm:mx-8"
        style={{ background: 'linear-gradient(180deg, #2A2F45 0%, #1A1F35 100%)' }} />
      <div className="h-1.5 sm:h-2 w-24 sm:w-32 mx-auto rounded-b-lg" style={{ background: '#1A1F35' }} />
    </div>
  )
}
