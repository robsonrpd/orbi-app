'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'

export function FotoUpload({ value, onChange, size = 'md' }: {
  value: string | null
  onChange: (url: string | null) => void
  size?: 'sm' | 'md'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao enviar.'); setLoading(false); return }
      onChange(data.url)
    } catch {
      setError('Erro de conexão.')
    }
    setLoading(false)
  }

  const dim = size === 'sm' ? 'w-24 h-24' : 'w-32 h-32'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`${dim} rounded-2xl border-2 border-dashed border-[#EAE8E1] relative overflow-hidden cursor-pointer hover:border-[#1A56FF] transition-all group`}
        onClick={() => !loading && inputRef.current?.click()}>
        {value ? (
          <>
            <img src={value} alt="foto" className="w-full h-full object-cover" />
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null) }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white">
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-[#F7F6F3] group-hover:bg-[#EEF2FF]/40 transition-colors">
            {loading ? <Loader2 className="size-5 animate-spin text-[#1A56FF]" />
              : <><Camera className="size-5 text-[#C8C5BB]" strokeWidth={1.5} /><p className="text-[10px] text-[#C8C5BB]">Adicionar foto</p></>}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {error && <p className="text-[10px] text-red-500 text-center max-w-[140px]">{error}</p>}
    </div>
  )
}
