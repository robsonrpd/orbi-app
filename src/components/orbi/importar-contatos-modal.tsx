'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { importarContatos } from '@/lib/actions/contacts'
import { X, Upload, FileSpreadsheet, Loader2, Check, AlertTriangle } from 'lucide-react'

type Props = { open: boolean; onClose: () => void }
type Resultado = { criados: number; ignorados: number; invalidos: number }

const COLUNAS = {
  name: ['nome', 'cliente', 'name', 'contato'],
  phone: ['telefone', 'celular', 'whatsapp', 'phone', 'fone', 'contato telefone', 'tel'],
  email: ['email', 'e-mail'],
  origem: ['origem', 'origin', 'fonte', 'source'],
}

function acharColuna(headers: string[], chaves: string[]) {
  const norm = (s: string) => s.toLowerCase().trim()
  const idx = headers.findIndex(h => chaves.includes(norm(h)))
  return idx
}

export function ImportarContatosModal({ open, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function handleClose() {
    setError(null); setResultado(null); setFileName('')
    onClose()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setLoading(true); setError(null); setResultado(null)

    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as unknown[][]

      if (raw.length < 2) { setError('A planilha precisa ter um cabeçalho e ao menos uma linha de dados.'); setLoading(false); return }

      const headers = (raw[0] as unknown[]).map(h => String(h ?? ''))
      const idxNome = acharColuna(headers, COLUNAS.name)
      const idxTel = acharColuna(headers, COLUNAS.phone)
      const idxEmail = acharColuna(headers, COLUNAS.email)
      const idxOrigem = acharColuna(headers, COLUNAS.origem)

      if (idxTel === -1) {
        setError('Não encontrei uma coluna de telefone na planilha. Use um cabeçalho como "Telefone", "Celular" ou "WhatsApp".')
        setLoading(false)
        return
      }

      const rows = raw.slice(1)
        .map(row => ({
          name: idxNome >= 0 ? String(row[idxNome] ?? '').trim() || null : null,
          phone: String(row[idxTel] ?? '').trim(),
          email: idxEmail >= 0 ? String(row[idxEmail] ?? '').trim() || null : null,
          origem: idxOrigem >= 0 ? String(row[idxOrigem] ?? '').trim() || null : null,
        }))
        .filter(r => r.phone)

      if (rows.length === 0) { setError('Nenhuma linha com telefone preenchido foi encontrada.'); setLoading(false); return }

      const r = await importarContatos(rows)
      setLoading(false)
      if (r?.error) { setError(r.error); return }
      setResultado({ criados: r.criados ?? 0, ignorados: r.ignorados ?? 0, invalidos: r.invalidos ?? 0 })
      router.refresh()
    } catch {
      setLoading(false)
      setError('Não consegui ler este arquivo. Verifique se é um .xlsx, .xls ou .csv válido.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><FileSpreadsheet className="size-4 text-white" strokeWidth={1.5} /></div>
            <p className="text-sm font-bold text-white">Importar Planilha</p>
          </div>
          <button onClick={handleClose} className="text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {!resultado && (
            <>
              <p className="text-sm text-[#8C8880]">
                Envie um arquivo <strong>.xlsx</strong> ou <strong>.csv</strong> com uma coluna de telefone (obrigatória) e, se quiser, nome, e-mail e origem.
              </p>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}
              <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#8C8880] cursor-pointer hover:border-[#1A56FF] transition-colors">
                {loading ? (
                  <><Loader2 className="size-6 animate-spin text-[#1A56FF]" /><span>Lendo {fileName}...</span></>
                ) : (
                  <><Upload className="size-6" /><span>Clique para escolher o arquivo</span></>
                )}
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={loading} className="hidden" />
              </label>
            </>
          )}

          {resultado && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#0DB57A]">
                <Check className="size-5" />
                <p className="text-sm font-bold">Importação concluída!</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#E6F9F3] p-3">
                  <p className="text-xl font-black text-[#0DB57A]" style={{ fontFamily: 'Fraunces, serif' }}>{resultado.criados}</p>
                  <p className="text-[10px] text-[#8C8880] uppercase font-bold mt-1">Criados</p>
                </div>
                <div className="rounded-xl bg-[#FEF3C7] p-3">
                  <p className="text-xl font-black text-[#F59E0B]" style={{ fontFamily: 'Fraunces, serif' }}>{resultado.ignorados}</p>
                  <p className="text-[10px] text-[#8C8880] uppercase font-bold mt-1">Já existiam</p>
                </div>
                <div className="rounded-xl bg-[#FEF2F2] p-3">
                  <p className="text-xl font-black text-red-500" style={{ fontFamily: 'Fraunces, serif' }}>{resultado.invalidos}</p>
                  <p className="text-[10px] text-[#8C8880] uppercase font-bold mt-1">Inválidos</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-full h-11 rounded-xl text-sm font-bold text-white" style={{ background: '#1A56FF' }}>Concluir</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
