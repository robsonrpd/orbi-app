import { NICHOS } from '@/lib/nichos'

export function Nichos() {
  return (
    <section id="nichos" className="py-14 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <p className="text-xs font-bold tracking-[3px] uppercase text-[#1A56FF] mb-3" style={{ fontFamily: 'Barlow, sans-serif' }}>
            Feito para o seu ramo
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Um sistema, vários negócios
          </h2>
          <p className="mt-4 text-[#8C8880] leading-relaxed">
            O Orbi se adapta ao seu tipo de negócio, mostrando só o que faz sentido para você.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {NICHOS.map((n, i) => (
            <div key={n.key}
              className="rounded-2xl border border-[#EAE8E1] p-6 text-center hover:border-[#1A56FF]/40 hover:shadow-lg hover:-translate-y-1 transition-all animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
              style={{ animationDuration: '700ms', animationDelay: `${i * 80}ms` }}>
              <div className="text-4xl mb-3">{n.emoji}</div>
              <h3 className="text-base font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{n.label}</h3>
              <p className="mt-1.5 text-sm text-[#8C8880] leading-relaxed">{n.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
