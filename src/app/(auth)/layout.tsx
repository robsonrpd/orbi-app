import { Eye, Calendar, MessageSquare, DollarSign, Users, BarChart3, Package, Globe } from 'lucide-react'

const features = [
  { icon: Calendar, text: 'Agendamentos online 24/7 com confirmação automática' },
  { icon: MessageSquare, text: 'Lembretes por WhatsApp para reduzir faltas' },
  { icon: Users, text: 'Cadastro de clientes com histórico completo' },
  { icon: DollarSign, text: 'Controle financeiro e fechamento de caixa' },
  { icon: BarChart3, text: 'Relatórios de faturamento e desempenho' },
  { icon: Package, text: 'Controle de estoque com alertas de baixa' },
  { icon: Globe, text: 'Link e perfil próprio para sua ótica' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Sora, sans-serif' }}>

      {/* Lado esquerdo — branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #0A0F1E 0%, #0D1635 50%, #0A1628 100%)' }}>

        {/* Textura sutil de fundo */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Blob decorativo */}
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1A56FF 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #1A56FF 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#1A56FF' }}>
              <Eye className="size-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-3xl font-black tracking-tight text-white"
              style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
              Orbi<span style={{ color: '#1A56FF' }}>.</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-white/40 ml-1">
            O sistema que trabalha enquanto você descansa.
          </p>
        </div>

        {/* Headline central */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-xs font-bold tracking-[3px] uppercase text-[#1A56FF] mb-4"
              style={{ fontFamily: 'Barlow, sans-serif' }}>
              Para óticas modernas
            </p>
            <h2 className="text-4xl font-black text-white leading-tight"
              style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
              Gerencie sua ótica<br />
              <span className="text-transparent" style={{
                backgroundImage: 'linear-gradient(90deg, #1A56FF, #93AAFF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                do jeito inteligente.
              </span>
            </h2>
            <p className="mt-4 text-white/50 text-sm leading-relaxed max-w-sm">
              Agendamentos, clientes, cobranças e IA no WhatsApp — tudo em um só lugar.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(26, 86, 255, 0.15)' }}>
                  <f.icon className="size-3.5" style={{ color: '#93AAFF' }} strokeWidth={1.5} />
                </div>
                <span className="text-sm text-white/60">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-xs text-white/25">© 2025 Orbi. — RP Marketing</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0DB57A]" />
            <span className="text-xs text-white/30">Sistema online</span>
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#1A56FF] flex items-center justify-center">
                <Eye className="size-4 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-2xl font-black text-[#1C1B18]"
                style={{ fontFamily: 'Fraunces, serif' }}>
                Orbi<span className="text-[#1A56FF]">.</span>
              </span>
            </div>
          </div>
          {children}
        </div>
      </div>

    </div>
  )
}
