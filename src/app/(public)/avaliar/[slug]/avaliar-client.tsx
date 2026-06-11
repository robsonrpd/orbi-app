'use client'

import { useState } from 'react'
import { submitReview } from '@/lib/actions/reviews'
import { Star, Loader2, CheckCircle2, Eye } from 'lucide-react'

export function AvaliarClient({ slug, companyName }: { slug: string; companyName: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [authorName, setAuthorName] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) { setError('Toque nas estrelas para dar sua nota.'); return }
    setLoading(true); setError(null)
    const result = await submitReview({ slug, authorName, rating, comment })
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setDone(true)
  }

  const labels = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente!']

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #0A0F1E 0%, #0D1635 60%, #1A2B5E 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-3xl font-black text-white" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
            Orbi<span style={{ color: '#1A56FF' }}>.</span>
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {done ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E6F9F3] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="size-8 text-[#0DB57A]" strokeWidth={1.5} />
              </div>
              <h1 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Obrigado! 💙</h1>
              <p className="text-sm text-[#8C8880] mt-2">Sua avaliação foi enviada para a <strong>{companyName}</strong>. Agradecemos muito pelo seu carinho!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8">
              <div className="text-center mb-6">
                <p className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Avalie sua experiência</p>
                <h1 className="text-2xl font-black text-[#1C1B18] mt-1" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{companyName}</h1>
              </div>

              {/* Estrelas */}
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button"
                      onClick={() => setRating(i)}
                      onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
                      className="transition-transform active:scale-90 hover:scale-110">
                      <Star className={`size-10 transition-colors ${i <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-[#EAE8E1]'}`} strokeWidth={1.2} />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-semibold h-5" style={{ color: '#F59E0B' }}>{labels[hover || rating]}</span>
              </div>

              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

              <div className="space-y-3">
                <input value={authorName} onChange={e => setAuthorName(e.target.value)}
                  placeholder="Seu nome (opcional)"
                  className="w-full h-12 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Conte como foi seu atendimento... (opcional)" rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB] resize-none" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white mt-5 transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ fontFamily: 'Barlow, sans-serif', background: 'linear-gradient(135deg,#1A56FF,#1445DD)', boxShadow: '0 4px 16px rgba(26,86,255,0.4)' }}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Enviar Avaliação'}
              </button>
              <p className="flex items-center justify-center gap-1 text-[11px] text-[#C8C5BB] mt-3">
                <Eye className="size-3" /> Sua avaliação passa por aprovação antes de ser publicada.
              </p>
            </form>
          )}
        </div>
        <p className="text-center text-[11px] text-white/30 mt-4">Powered by Orbi · Gestão para óticas</p>
      </div>
    </div>
  )
}
