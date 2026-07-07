'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Download, Upload, Phone, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown, Tag as TagIcon, User,
  Trash2, Loader2, AlertTriangle, X, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NovoClienteModal } from '@/components/orbi/novo-cliente-modal'
import { ClienteDetalheModal } from '@/components/orbi/cliente-detalhe-modal'
import { ImportarContatosModal } from '@/components/orbi/importar-contatos-modal'
import { listarImportacoes, excluirImportacao, excluirImportados } from '@/lib/actions/contacts'

type Contact = {
  id: string
  name: string | null
  phone: string
  email: string | null
  data_nascimento: string | null
  origem: string | null
  criado_por: string | null
  tags: string[]
  notes: string | null
  created_at: string
  cep?: string | null; endereco?: string | null; numero?: string | null
  bairro?: string | null; cidade?: string | null; uf?: string | null
}
type Stats = {
  totalGasto: number; numAgendamentos: number; numCompras: number
  devendo?: number; formas?: Record<string, number>; produtos?: string[]
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type SortKey = 'name' | 'origem' | 'created_at' | 'criado_por'
const COLS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Nome' },
  { key: 'origem', label: 'Origem' },
  { key: 'created_at', label: 'Data de inserção' },
  { key: 'criado_por', label: 'Quem inseriu' },
]

export function ClientesClient({ contacts, stats }: { contacts: Contact[]; stats: Record<string, Stats> }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [detalhe, setDetalhe] = useState<Contact | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const statsFor = (id: string): Stats => stats[id] ?? { totalGasto: 0, numAgendamentos: 0, numCompras: 0, devendo: 0, formas: {}, produtos: [] }

  // excluir importações (por planilha/lote)
  const [excluirOpen, setExcluirOpen] = useState(false)
  const [carregandoLotes, setCarregandoLotes] = useState(false)
  const [lotes, setLotes] = useState<{ batchId: string; total: number; criadoPor: string | null; dataMaisRecente: string }[]>([])
  const [semLote, setSemLote] = useState(0)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [msgResultado, setMsgResultado] = useState<string | null>(null)

  async function abrirExcluirImportados() {
    setExcluirOpen(true); setMsgResultado(null); setConfirmando(null); setCarregandoLotes(true)
    const r = await listarImportacoes()
    setCarregandoLotes(false)
    setLotes(r.lotes ?? [])
    setSemLote(r.semLote ?? 0)
  }
  async function excluirLote(batchId: string) {
    setExcluindoId(batchId); setConfirmando(null)
    const r = batchId === 'sem-lote' ? await excluirImportados() : await excluirImportacao(batchId)
    setExcluindoId(null)
    if (r.success) {
      setMsgResultado(`${r.excluidos ?? 0} contato${(r.excluidos ?? 0) === 1 ? '' : 's'} excluído${(r.excluidos ?? 0) === 1 ? '' : 's'}${(r.falharam ?? 0) > 0 ? ` (${r.falharam} não puderam ser removidos por ter vendas/agendamentos vinculados)` : ''}.`)
      setLotes(ls => ls.filter(l => l.batchId !== batchId))
      if (batchId === 'sem-lote') setSemLote(0)
      router.refresh()
    }
  }
  function fecharExcluirImportados() { setExcluirOpen(false); setLotes([]); setSemLote(0); setMsgResultado(null); setConfirmando(null) }

  function ordenarPor(key: SortKey) {
    if (key === sortKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return }
    setSortKey(key)
    setSortDir(key === 'created_at' ? 'desc' : 'asc')
  }

  const sorted = useMemo(() => {
    const val = (c: Contact) => {
      if (sortKey === 'name') return (c.name ?? c.phone ?? '').toLowerCase()
      if (sortKey === 'origem') return (c.origem ?? '').toLowerCase()
      if (sortKey === 'criado_por') return (c.criado_por ?? '').toLowerCase()
      return c.created_at
    }
    return [...contacts].sort((a, b) => {
      const va = val(a), vb = val(b)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [contacts, sortKey, sortDir])

  async function exportarExcel() {
    const XLSX = await import('xlsx')
    const dados = sorted.map(c => ({
      Nome: c.name ?? '', Origem: c.origem ?? '', Telefone: c.phone, Email: c.email ?? '',
      'Data de inserção': formatDate(c.created_at), 'Quem inseriu': c.criado_por ?? '',
      Tags: (c.tags ?? []).join(', '), 'Data de Nascimento': c.data_nascimento ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `clientes-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-[#EAE8E1]">
        <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
            Todos os clientes
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}
              className="h-8 text-xs border-[#EAE8E1] text-[#8C8880] hover:text-[#2E2D29] gap-1.5">
              <Upload className="size-3.5" /> Importar
            </Button>
            <Button variant="outline" size="sm" onClick={exportarExcel}
              className="h-8 text-xs border-[#EAE8E1] text-[#8C8880] hover:text-[#2E2D29] gap-1.5">
              <Download className="size-3.5" /> Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={abrirExcluirImportados}
              className="h-8 text-xs border-[#EAE8E1] text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5">
              <Trash2 className="size-3.5" /> Excluir planilhas
            </Button>
            <Button size="sm" onClick={() => setModalOpen(true)}
              className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
              <UserPlus className="size-3.5" /> Novo cliente
            </Button>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-[#EAE8E1]">
              {COLS.map(col => (
                <th key={col.key} onClick={() => ordenarPor(col.key)}
                  className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider cursor-pointer select-none hover:text-[#1A56FF] transition-colors"
                  style={{ fontFamily: 'Barlow, sans-serif' }}>
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : <ArrowUpDown className="size-3 opacity-30" />}
                  </span>
                </th>
              ))}
              <th className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Telefone</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE8E1]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F7F6F3] flex items-center justify-center">
                      <UserPlus className="size-5 text-[#C8C5BB]" />
                    </div>
                    <p className="text-sm text-[#8C8880]">Nenhum cliente cadastrado ainda.</p>
                    <Button size="sm" onClick={() => setModalOpen(true)}
                      className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
                      <UserPlus className="size-3.5" /> Cadastrar primeiro cliente
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((c) => (
                <tr key={c.id} onClick={() => setDetalhe(c)} className="hover:bg-[#EEF2FF] cursor-pointer transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xs font-bold text-[#1A56FF] shrink-0">
                        {(c.name ?? c.phone)[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-[#1C1B18]">
                        {c.name ?? <span className="text-[#C8C5BB] font-normal">Sem nome</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {c.origem ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F7F6F3] rounded-full text-xs text-[#8C8880] border border-[#EAE8E1]">
                        <TagIcon className="size-2.5" />{c.origem}
                      </span>
                    ) : <span className="text-xs text-[#C8C5BB]">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#8C8880]">{formatDate(c.created_at)}</td>
                  <td className="px-5 py-3.5">
                    {c.criado_por ? (
                      <span className="flex items-center gap-1.5 text-sm text-[#8C8880]"><User className="size-3.5 text-[#C8C5BB]" />{c.criado_por}</span>
                    ) : <span className="text-xs text-[#C8C5BB]">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-[#8C8880]">
                      <Phone className="size-3.5 text-[#C8C5BB]" />{c.phone}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-[#1A56FF] font-medium">
                      Ver ficha <ChevronRight className="size-3.5" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NovoClienteModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ImportarContatosModal open={importOpen} onClose={() => setImportOpen(false)} />
      {detalhe && <ClienteDetalheModal contact={detalhe} stats={statsFor(detalhe.id)} onClose={() => setDetalhe(null)} />}

      {/* Excluir importações */}
      {excluirOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE8E1] shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-500" />
                <p className="text-sm font-bold text-[#1C1B18]">Excluir planilhas importadas</p>
              </div>
              <button onClick={fecharExcluirImportados} className="text-[#8C8880] hover:text-[#1C1B18]"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {msgResultado && (
                <div className="flex items-center gap-2 bg-[#E6F9F3] border border-[#0DB57A]/20 text-[#0DB57A] text-sm font-medium rounded-xl px-3 py-2.5">
                  <Check className="size-4 shrink-0" /> {msgResultado}
                </div>
              )}
              {carregandoLotes ? (
                <p className="text-sm text-[#8C8880] flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Carregando importações...</p>
              ) : lotes.length === 0 && semLote === 0 ? (
                <p className="text-sm text-[#8C8880] text-center py-6">Nenhuma importação de planilha encontrada.</p>
              ) : (
                <>
                  <p className="text-xs text-[#8C8880]">Escolha qual planilha importada você quer excluir. Cada uma só afeta os contatos daquela importação.</p>
                  {lotes.map(l => (
                    <div key={l.batchId} className="rounded-xl border border-[#EAE8E1] p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1C1B18]">{l.total} contato{l.total === 1 ? '' : 's'}</p>
                        <p className="text-xs text-[#8C8880]">Importado {formatDate(l.dataMaisRecente)}{l.criadoPor ? ` por ${l.criadoPor}` : ''}</p>
                      </div>
                      {confirmando === l.batchId ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setConfirmando(null)} className="text-xs font-semibold text-[#8C8880] px-2 py-1.5">Cancelar</button>
                          <button onClick={() => excluirLote(l.batchId)} disabled={excluindoId === l.batchId}
                            className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600">
                            {excluindoId === l.batchId ? <Loader2 className="size-3.5 animate-spin" /> : 'Confirmar'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmando(l.batchId)}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-500 border border-[#EAE8E1] hover:bg-red-50">
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {semLote > 0 && (
                    <div className="rounded-xl border border-[#EAE8E1] p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1C1B18]">{semLote} contato{semLote === 1 ? '' : 's'}</p>
                        <p className="text-xs text-[#8C8880]">Importação antiga (sem identificação de lote)</p>
                      </div>
                      {confirmando === 'sem-lote' ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setConfirmando(null)} className="text-xs font-semibold text-[#8C8880] px-2 py-1.5">Cancelar</button>
                          <button onClick={() => excluirLote('sem-lote')} disabled={excluindoId === 'sem-lote'}
                            className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600">
                            {excluindoId === 'sem-lote' ? <Loader2 className="size-3.5 animate-spin" /> : 'Confirmar'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmando('sem-lote')}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-500 border border-[#EAE8E1] hover:bg-red-50">
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
