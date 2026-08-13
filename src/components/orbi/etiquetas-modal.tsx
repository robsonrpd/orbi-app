'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import JsBarcode from 'jsbarcode'
import { gerarCodigosBarras } from '@/lib/actions/products'
import { X, Printer, Loader2, Check, AlertTriangle, ScanLine, Tag } from 'lucide-react'

type Product = {
  id: string; name: string; price: number; stock: number
  grife: string | null; controla_estoque: boolean | null; codigo_barras: string | null
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

/** Desenha o código de barras. O jsbarcode valida o EAN-13 e não renderiza um código inválido. */
function CodigoBarras({ codigo }: { codigo: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      // medido no navegador: módulo de 0,379mm (nominal do EAN-13 é 0,33mm) e barras de 18mm.
      // barra alta importa: dá margem vertical pro leitor acertar a mira na primeira passada.
      JsBarcode(ref.current, codigo, {
        format: 'EAN13', width: 1.5, height: 55, fontSize: 11,
        margin: 0, displayValue: true, font: 'monospace',
      })
    } catch {
      // código fora do padrão EAN-13 — a etiqueta sai sem as barras, mas com o número
    }
  }, [codigo])
  return <svg ref={ref} />
}

/** Folha de etiquetas — só aparece na impressão. */
function FolhaImpressao({ etiquetas }: { etiquetas: Product[] }) {
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  if (!montado) return null

  return createPortal(
    <>
      <style>{`
        .orbi-etiquetas { display: none; }
        @media print {
          @page { size: A4; margin: 8mm; }
          body * { visibility: hidden !important; }
          .orbi-etiquetas, .orbi-etiquetas * { visibility: visible !important; }
          .orbi-etiquetas {
            display: grid !important;
            position: absolute !important; left: 0; top: 0; width: 100%;
            grid-template-columns: repeat(3, 1fr); gap: 2mm;
          }
          .orbi-etiqueta {
            /* border-box é essencial: sem ele o padding soma por fora, a etiqueta
               fica maior que o previsto e cabe menos coisa na folha do que a tela informa */
            box-sizing: border-box;
            height: 38mm; padding: 2mm; border: 0.2mm dashed #bbb;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; overflow: hidden; break-inside: avoid;
          }
        }
      `}</style>
      <div className="orbi-etiquetas">
        {etiquetas.map((p, i) => (
          <div key={`${p.id}-${i}`} className="orbi-etiqueta">
            <p style={{ fontSize: '7pt', fontWeight: 700, lineHeight: 1.1, maxHeight: '2.4em', overflow: 'hidden' }}>
              {p.name}
            </p>
            {p.grife && <p style={{ fontSize: '6pt', color: '#555' }}>{p.grife}</p>}
            {p.codigo_barras && <CodigoBarras codigo={p.codigo_barras} />}
            <p style={{ fontSize: '11pt', fontWeight: 800, marginTop: '0.5mm' }}>{fmt(p.price)}</p>
          </div>
        ))}
      </div>
    </>,
    document.body,
  )
}

export function EtiquetasModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const [qtds, setQtds] = useState<Record<string, number>>(() =>
    // por padrão, uma etiqueta por peça em estoque — é o que ele precisa colar hoje
    Object.fromEntries(products.map(p => [p.id, p.controla_estoque === false ? 1 : Math.max(0, p.stock)])),
  )
  const [gerando, setGerando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // a folha só é montada no clique de imprimir: desenhar centenas de códigos de barras
  // a cada tecla digitada nas quantidades travaria o navegador
  const [preparando, setPreparando] = useState(false)

  const semCodigo = products.filter(p => !p.codigo_barras?.trim())
  const comCodigo = products.filter(p => !!p.codigo_barras?.trim())

  // expande cada produto na quantidade escolhida — é isso que vira a folha
  const LIMITE = 500
  const etiquetas = useMemo(
    () => comCodigo.flatMap(p => Array.from({ length: Math.min(qtds[p.id] ?? 0, 300) }, () => p)).slice(0, LIMITE),
    [comCodigo, qtds],
  )
  const pedidas = comCodigo.reduce((s, p) => s + Math.min(qtds[p.id] ?? 0, 300), 0)

  function imprimir() {
    setPreparando(true)
    // dá um instante pro React montar a folha e o jsbarcode desenhar antes de abrir a impressão
    setTimeout(() => {
      window.print()
      setPreparando(false)
    }, 400)
  }

  async function gerar() {
    setGerando(true); setErro(null); setAviso(null)
    const r = await gerarCodigosBarras()
    setGerando(false)
    if (r?.error) { setErro(r.error); return }
    setAviso(`${r.gerados} código(s) criado(s). Feche e abra as etiquetas de novo pra ver.`)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-white" />
              <p className="text-sm font-bold text-white">Imprimir etiquetas</p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X className="size-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {erro && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{erro}</div>}
            {aviso && <div className="bg-[#E6F9F3] border border-[#0DB57A]/20 text-[#0DB57A] text-sm rounded-xl px-4 py-3 flex items-center gap-2"><Check className="size-4" /> {aviso}</div>}

            {semCodigo.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>{semCodigo.length} peça(s) ainda sem código.</strong> O Orbi pode criar um código
                    próprio pra cada uma — assim dá pra imprimir a etiqueta e bipar na venda.
                  </p>
                </div>
                <button onClick={gerar} disabled={gerando}
                  className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#F59E0B' }}>
                  {gerando ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
                  Criar códigos que faltam
                </button>
              </div>
            )}

            {comCodigo.length === 0 ? (
              <p className="text-sm text-[#8C8880] text-center py-8">Nenhuma peça com código ainda.</p>
            ) : (
              <>
                <p className="text-xs text-[#8C8880]">
                  Escolha quantas etiquetas de cada peça. Já vem preenchido com a quantidade em estoque —
                  uma etiqueta por peça na loja.
                </p>
                <div className="space-y-1.5">
                  {comCodigo.map(p => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg border border-[#EAE8E1] px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1C1B18] truncate">{p.name}</p>
                        <p className="text-[11px] text-[#8C8880] font-mono">{p.codigo_barras} · {fmt(p.price)}</p>
                      </div>
                      <input type="number" min="0" max="300" value={qtds[p.id] ?? 0}
                        onChange={e => setQtds(q => ({ ...q, [p.id]: Math.max(0, Math.min(300, Number(e.target.value) || 0)) }))}
                        className="w-20 h-9 px-2 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-center outline-none focus:border-[#1A56FF]" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[#EAE8E1] shrink-0 flex items-center gap-3">
            <p className="text-xs text-[#8C8880] flex-1">
              <strong className="text-[#1C1B18]">{etiquetas.length}</strong> etiqueta(s) ·
              {' '}{Math.ceil(etiquetas.length / 21) || 0} folha(s) A4
              {pedidas > LIMITE && (
                <span className="block text-amber-600 font-semibold mt-0.5">
                  Máximo de {LIMITE} por vez — imprima em partes.
                </span>
              )}
            </p>
            <button type="button" onClick={onClose} className="h-11 px-5 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Fechar</button>
            <button onClick={imprimir} disabled={etiquetas.length === 0 || preparando}
              className="h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-40"
              style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
              {preparando ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              {preparando ? 'Preparando...' : 'Imprimir'}
            </button>
          </div>
        </div>
      </div>

      {preparando && <FolhaImpressao etiquetas={etiquetas} />}
    </>
  )
}
