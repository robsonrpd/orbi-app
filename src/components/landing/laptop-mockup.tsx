import Image from 'next/image'

export function LaptopMockup() {
  return (
    <div className="mt-16 rounded-2xl overflow-hidden shadow-2xl">
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
