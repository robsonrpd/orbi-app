import Image from 'next/image'

export function LaptopMockup() {
  return (
    <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
      <div className="sm:col-span-2 rounded-2xl overflow-hidden shadow-2xl">
        <Image
          src="/brand/dashboard-desktop.png"
          alt="Painel Orbi no computador — dashboard, vendas e financeiro"
          width={1586}
          height={992}
          className="w-full h-auto"
        />
      </div>
      <div className="rounded-2xl overflow-hidden shadow-2xl max-w-[280px] mx-auto sm:max-w-none">
        <Image
          src="/brand/dashboard-mobile.png"
          alt="Painel Orbi no notebook e celular"
          width={853}
          height={1844}
          className="w-full h-auto"
        />
      </div>
    </div>
  )
}
