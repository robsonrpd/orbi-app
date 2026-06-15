import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Sora, sans-serif' }}>

      {/* Lado esquerdo — arte de marca */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden" style={{ background: '#010D2D' }}>
        <Image
          src="/brand/Fundo.png"
          alt="Orbi — Gestão 360° para o seu negócio"
          fill
          priority
          className="object-contain"
        />
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/brand/icone.png"
              alt="Orbi"
              width={72}
              height={72}
              className="mx-auto"
              priority
            />
          </div>
          {children}
        </div>
      </div>

    </div>
  )
}
