'use client'

// Menu de uma mensagem, como no WhatsApp Web: reagir, responder, copiar, encaminhar, apagar.
// No computador abre pela setinha (ao passar o mouse) ou com o botão direito; no celular, segurando o dedo na mensagem.
import { ChevronDown, Copy, CornerUpLeft, Forward, Loader2, Trash2 } from 'lucide-react'

export const REACOES = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function MenuMensagem({
  aberto, minha, apagando, podeResponder, podeReagir, podeParaTodos, minhaReacao,
  onAbrir, onFechar, onReagir, onResponder, onCopiar, onEncaminhar, onApagar,
}: {
  aberto: boolean; minha: boolean; apagando: boolean
  podeResponder: boolean; podeReagir: boolean; podeParaTodos: boolean; minhaReacao?: string
  onAbrir: () => void; onFechar: () => void
  onReagir: (emoji: string) => void; onResponder: () => void; onCopiar: () => void; onEncaminhar: () => void
  onApagar: (paraTodos: boolean) => void
}) {
  const item = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2E2D29] hover:bg-[#F7F6F3] disabled:opacity-50 text-left'
  return (
    <>
      <button onClick={e => { e.stopPropagation(); aberto ? onFechar() : onAbrir() }} aria-label="Opções da mensagem"
        className={`absolute top-1 ${minha ? 'right-1' : 'right-1'} z-10 w-6 h-6 rounded-full flex items-center justify-center text-[#8C8880] bg-white/80 shadow-sm transition-opacity ${aberto ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
        <ChevronDown className="size-4" />
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 md:bg-transparent" onClick={e => { e.stopPropagation(); onFechar() }} />
          <div onClick={e => e.stopPropagation()}
            className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl md:rounded-xl md:absolute md:inset-x-auto md:bottom-auto md:top-8 ${minha ? 'md:right-0' : 'md:left-0'} md:w-60 bg-white shadow-2xl border border-[#EAE8E1] overflow-hidden pb-[env(safe-area-inset-bottom)]`}>
            {podeReagir && (
              <div className="flex items-center justify-around px-2 py-2 border-b border-[#EAE8E1]">
                {REACOES.map(e => (
                  <button key={e} onClick={() => onReagir(minhaReacao === e ? '' : e)}
                    className={`text-2xl md:text-xl w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center hover:bg-[#F7F6F3] ${minhaReacao === e ? 'bg-[#EEF2FF]' : ''}`}>{e}</button>
                ))}
              </div>
            )}
            {podeResponder && <button className={item} onClick={onResponder}><CornerUpLeft className="size-4 text-[#8C8880]" /> Responder</button>}
            <button className={item} onClick={onCopiar}><Copy className="size-4 text-[#8C8880]" /> Copiar</button>
            <button className={item} onClick={onEncaminhar}><Forward className="size-4 text-[#8C8880]" /> Encaminhar</button>
            {podeParaTodos && (
              <button className={item} disabled={apagando} onClick={() => onApagar(true)}>
                {apagando ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-red-500" />} <span className="text-red-600">Apagar para todos</span>
              </button>
            )}
            <button className={item} disabled={apagando} onClick={() => onApagar(false)}>
              {apagando ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-[#8C8880]" />} Apagar só aqui
            </button>
            <button className={`${item} md:hidden justify-center text-[#8C8880] border-t border-[#EAE8E1]`} onClick={onFechar}>Cancelar</button>
          </div>
        </>
      )}
    </>
  )
}

/** Toque longo (celular) abre o menu, sem atrapalhar a rolagem. */
export function toqueLongo(abrir: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancelar = () => { if (timer) { clearTimeout(timer); timer = null } }
  return {
    onTouchStart: () => { cancelar(); timer = setTimeout(() => { timer = null; abrir() }, 450) },
    onTouchEnd: cancelar,
    onTouchMove: cancelar,
    onTouchCancel: cancelar,
  }
}
