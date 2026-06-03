export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F3] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            Orbi<span className="text-[#1A56FF]">.</span>
          </h1>
          <p className="mt-1 text-sm text-[#8C8880]" style={{ fontFamily: 'Sora, sans-serif' }}>
            O sistema que trabalha enquanto você descansa.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#EAE8E1] shadow-sm p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
