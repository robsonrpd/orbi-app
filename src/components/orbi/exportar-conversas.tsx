'use client'

// Exportar conversas: planilha (abre no Excel) ou texto no mesmo formato do "Exportar conversa" do WhatsApp.
// O arquivo é montado aqui no navegador, lote a lote (ver exportarConversasLote).
import { useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import { exportarConversasLote, type ConversaExportada } from '@/lib/actions/exportar'

type Periodo = '7' | '30' | '90' | 'tudo' | 'outro'
type Formato = 'planilha' | 'texto'

const QUEM = { cliente: 'Cliente', loja: 'Loja', ia: 'IA' } as const

function dataHora(iso: string) {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

function celula(v: string) {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function montarPlanilha(convs: ConversaExportada[]) {
  const linhas = ['Data;Hora;Contato;Telefone;Enviada por;Mensagem;Tipo;Link do arquivo']
  for (const c of convs) for (const m of c.mensagens) {
    const { data, hora } = dataHora(m.ts)
    linhas.push([data, hora, c.nome, c.grupo ? 'Grupo' : c.numero, QUEM[m.quem], m.texto, m.tipo, m.link ?? ''].map(celula).join(';'))
  }
  // BOM: o Excel abre com acentos certos
  return '﻿' + linhas.join('\r\n')
}

function montarTexto(convs: ConversaExportada[], loja: string) {
  const partes: string[] = []
  for (const c of convs) {
    partes.push(`===== ${c.nome}${c.grupo ? ' (grupo)' : ` (+${c.numero})`} =====`)
    for (const m of c.mensagens) {
      const { data, hora } = dataHora(m.ts)
      const autor = m.quem === 'cliente' ? c.nome : m.quem === 'ia' ? `${loja} (IA)` : loja
      partes.push(`${data} ${hora} - ${autor}: ${m.texto}${m.link ? ` <arquivo: ${m.link}>` : ''}`)
    }
    partes.push('')
  }
  return partes.join('\r\n')
}

function baixar(conteudo: string, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const nomeArquivo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'conversas'

export function ExportarConversas({ onFechar, loja, conversa }: {
  onFechar: () => void; loja: string
  /** exportar só esta conversa (no cabeçalho da conversa) */
  conversa?: { id: string; nome: string }
}) {
  const [periodo, setPeriodo] = useState<Periodo>(conversa ? 'tudo' : '30')
  const [de, setDe] = useState(''), [ate, setAte] = useState('')
  const [formato, setFormato] = useState<Formato>(conversa ? 'texto' : 'planilha')
  const [grupos, setGrupos] = useState(false)
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState<string | null>(null)

  async function exportar() {
    setErro(null); setPronto(null)
    let desde: string | null = null, limite: string | null = null
    if (periodo === 'outro') {
      if (!de) { setErro('Escolha a data inicial.'); return }
      desde = new Date(`${de}T00:00:00`).toISOString()
      if (ate) limite = new Date(`${ate}T23:59:59`).toISOString()
    } else if (periodo !== 'tudo') {
      desde = new Date(Date.now() - Number(periodo) * 86_400_000).toISOString()
    }

    const todas: ConversaExportada[] = []
    let inicio: number | null = 0
    setProgresso({ feitas: 0, total: 0 })
    while (inicio !== null) {
      const r = await exportarConversasLote({ desde, ate: limite, incluirGrupos: grupos, conversaId: conversa?.id ?? null, inicio })
      if (r.error) { setErro(r.error); setProgresso(null); return }
      todas.push(...(r.conversas ?? []))
      inicio = r.proximo ?? null
      setProgresso({ feitas: Math.min((r.total ?? 0), (inicio ?? r.total ?? 0)), total: r.total ?? 0 })
    }
    setProgresso(null)
    const msgs = todas.reduce((n, c) => n + c.mensagens.length, 0)
    if (!msgs) { setErro('Nenhuma mensagem nesse período.'); return }

    const base = conversa ? `conversa-${nomeArquivo(conversa.nome)}` : `conversas-${nomeArquivo(loja)}`
    const hoje = new Date().toISOString().slice(0, 10)
    if (formato === 'planilha') baixar(montarPlanilha(todas), `${base}-${hoje}.csv`, 'text/csv;charset=utf-8')
    else baixar(montarTexto(todas, loja), `${base}-${hoje}.txt`, 'text/plain;charset=utf-8')
    setPronto(`${todas.length} conversa${todas.length > 1 ? 's' : ''} e ${msgs.toLocaleString('pt-BR')} mensagens exportadas.`)
  }

  const opc = (ativo: boolean) => `px-3 h-9 rounded-lg text-sm font-semibold border transition-colors ${ativo ? 'bg-[#EEF2FF] border-[#1A56FF] text-[#1A56FF]' : 'bg-white border-[#EAE8E1] text-[#5C5A54]'}`
  const label = 'text-[11px] font-bold text-[#8C8880] uppercase tracking-wide block mb-1.5'
  const ocupado = progresso !== null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4" style={{ background: 'rgba(10,15,30,0.55)' }} onClick={() => !ocupado && onFechar()}>
      <div className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-[#EAE8E1] flex items-center justify-between">
          <p className="text-sm font-bold text-[#1C1B18]">{conversa ? `Exportar conversa — ${conversa.nome}` : 'Exportar conversas'}</p>
          <button onClick={onFechar} disabled={ocupado} aria-label="Fechar" className="text-[#8C8880] hover:text-[#1C1B18] disabled:opacity-40"><X className="size-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <span className={label}>Período</span>
            <div className="flex flex-wrap gap-2">
              {(['7', '30', '90', 'tudo', 'outro'] as Periodo[]).map(pp => (
                <button key={pp} onClick={() => setPeriodo(pp)} className={opc(periodo === pp)}>
                  {pp === 'tudo' ? 'Tudo' : pp === 'outro' ? 'Escolher datas' : `Últimos ${pp} dias`}
                </button>
              ))}
            </div>
            {periodo === 'outro' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input type="date" value={de} onChange={e => setDe(e.target.value)} className="h-10 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm" />
                <input type="date" value={ate} onChange={e => setAte(e.target.value)} className="h-10 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm" />
              </div>
            )}
          </div>
          <div>
            <span className={label}>Formato</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFormato('planilha')} className={opc(formato === 'planilha')}>Planilha (Excel)</button>
              <button onClick={() => setFormato('texto')} className={opc(formato === 'texto')}>Texto (como o WhatsApp)</button>
            </div>
            <p className="text-[11px] text-[#8C8880] mt-1.5">
              {formato === 'planilha' ? 'Uma linha por mensagem: data, hora, contato, telefone, quem enviou, mensagem e link do arquivo.' : 'Igual ao "Exportar conversa" do WhatsApp, com o link de fotos, áudios e documentos.'}
            </p>
          </div>
          {!conversa && (
            <label className="flex items-center gap-2 text-sm text-[#2E2D29]">
              <input type="checkbox" checked={grupos} onChange={e => setGrupos(e.target.checked)} className="size-4 accent-[#1A56FF]" /> Incluir conversas de grupo
            </label>
          )}
          {progresso && (
            <p className="text-xs text-[#5C5A54] flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-[#1A56FF]" />
              Juntando conversas{progresso.total ? ` — ${progresso.feitas} de ${progresso.total}` : '…'}
            </p>
          )}
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          {pronto && <p className="text-xs text-[#0DB57A] font-semibold">✓ {pronto} O arquivo foi baixado.</p>}
          <button onClick={exportar} disabled={ocupado}
            className="w-full h-11 rounded-xl bg-[#1A56FF] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Exportar
          </button>
        </div>
      </div>
    </div>
  )
}
