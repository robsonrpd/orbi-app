// Cartão do anúncio que trouxe o cliente ("clique para o WhatsApp"), igual ao que o WhatsApp Web mostra na 1ª mensagem.
export type AnuncioMsg = { titulo?: string; corpo?: string; link?: string; post?: string; imagem?: string; id?: string; app?: string }

export function CartaoAnuncio({ anuncio }: { anuncio: AnuncioMsg }) {
  const href = anuncio.link || anuncio.post
  const origem = anuncio.app === 'instagram' ? 'Instagram' : anuncio.app === 'facebook' ? 'Facebook' : 'anúncio'
  return (
    <div className="mb-1.5 rounded-lg overflow-hidden border border-[#E5E3DC] bg-[#F7F6F3]">
      {anuncio.imagem && <img src={anuncio.imagem} alt="" loading="lazy" decoding="async" className="w-full max-h-40 object-cover" />}
      <div className="px-2.5 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#1A56FF] mb-0.5">📣 Veio de um anúncio no {origem}</p>
        {anuncio.titulo && <p className="text-xs font-semibold text-[#1C1B18] leading-snug">{anuncio.titulo}</p>}
        {anuncio.corpo && <p className="text-xs text-[#5C5A54] leading-snug mt-0.5 line-clamp-3 whitespace-pre-wrap">{anuncio.corpo}</p>}
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-xs font-semibold text-[#1A56FF] underline break-all">
            Ver anúncio
          </a>
        )}
      </div>
    </div>
  )
}
