'use client'

import { useState, useMemo } from 'react'
import { UserPlus, Download, Upload, Phone, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown, Tag as TagIcon, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NovoClienteModal } from '@/components/orbi/novo-cliente-modal'
import { ClienteDetalheModal } from '@/components/orbi/cliente-detalhe-modal'
import { ImportarContatosModal } from '@/components/orbi/importar-contatos-modal'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [detalhe, setDetalhe] = useState<Contact | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const statsFor = (id: string): Stats => stats[id] ?? { totalGasto: 0, numAgendamentos: 0, numCompras: 0, devendo: 0, formas: {}, produtos: [] }

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
    </>
  )
}
