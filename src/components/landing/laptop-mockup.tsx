import Image from 'next/image'

export function LaptopMockup() {
  return (
    <div className="mt-10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both">
      <Image
        src="/brand/dashboard-desktop.png"
        alt="Painel Orbi — dashboard, vendas e financeiro"
        width={1586}
        height={992}
        className="w-full h-auto"
      />
    </div>
  )
}
