import { MessageCircle, Calendar, Users, DollarSign, Package, BarChart3 } from 'lucide-react'

const features = [
  {
    icon: MessageCircle,
    title: 'WhatsApp integrado',
    desc: 'Todas as conversas do WhatsApp em um só lugar, com cada cliente virando lead automaticamente no seu CRM.',
  },
  {
    icon: Calendar,
    title: 'Agendamentos',
    desc: 'Link próprio para o cliente agendar, com confirmação e lembrete automático para reduzir faltas.',
  },
  {
    icon: Users,
    title: 'CRM completo',
    desc: 'Funil de leads em tempo real, histórico de conversas, tags e ficha completa de cada cliente.',
  },
  {
    icon: DollarSign,
    title: 'Financeiro & Caixa',
    desc: 'Controle de entradas, saídas, fechamento de caixa e cobranças — tudo organizado em um só lugar.',
  },
  {
    icon: Package,
    title: 'Estoque & Produtos',
    desc: 'Cadastre produtos e serviços, controle o estoque e nunca mais venda o que não tem.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios & Analytics',
    desc: 'Acompanhe vendas, desempenho da equipe e indicadores do seu negócio em tempo real.',
  },
]

export function Features() {
  return (
    <section id="funcionalidades" className="py-14 sm:py-20 bg-[#F7F6F3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <p className="text-xs font-bold tracking-[3px] uppercase text-[#1A56FF] mb-3" style={{ fontFamily: 'Barlow, sans-serif' }}>
            Tudo o que você precisa
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Um painel completo para o seu negócio
          </h2>
          <p className="mt-4 text-[#8C8880] leading-relaxed">
            Pare de usar planilhas, agendas de papel e cinco aplicativos diferentes.
            O Orbi reúne tudo o que sua equipe precisa no dia a dia.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.title}
              className="glow-card p-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-both transition-transform hover:-translate-y-1"
              style={{ animationDuration: '700ms', animationDelay: `${i * 80}ms` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#EEF2FF' }}>
                <f.icon className="size-5" style={{ color: '#1A56FF' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{f.title}</h3>
              <p className="mt-1.5 text-sm text-[#8C8880] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
