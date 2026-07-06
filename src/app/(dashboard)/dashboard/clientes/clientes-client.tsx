'use client'

import { useState } from 'react'
import { UserPlus, Download, Upload, Phone, Tag, ChevronRight } from 'lucide-react'
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

export function ClientesClient({ contacts, stats }: { contacts: Contact[]; stats: Record<string, Stats> }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [detalhe, setDetalhe] = useState<Contact | null>(null)
  const statsFor = (id: string): Stats => stats[id] ?? { totalGasto: 0, numAgendamentos: 0, numCompras: 0, devendo: 0, formas: {}, produtos: [] }

  async function exportarExcel() {
    const XLSX = await import('xlsx')
    const dados = contacts.map(c => ({
      Nome: c.name ?? '', Telefone: c.phone, Email: c.email ?? '',
      Origem: c.origem ?? '', Tags: (c.tags ?? []).join(', '),
      'Data de Nascimento': c.data_nascimento ?? '', 'Cadastrado em': formatDate(c.created_at),
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
              {['Nome', 'Telefone', 'Tags', 'Cadastrado em', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider"
                  style={{ fontFamily: 'Barlow, sans-serif' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE8E1]">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
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
              contacts.map((c) => (
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
                    <div className="flex items-center gap-1.5 text-sm text-[#8C8880]">
                      <Phone className="size-3.5 text-[#C8C5BB]" />{c.phone}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags ?? []).length === 0 ? (
                        <span className="text-xs text-[#C8C5BB]">—</span>
                      ) : (
                        (c.tags ?? []).map((tag: string) => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F7F6F3] rounded-full text-xs text-[#8C8880] border border-[#EAE8E1]">
                            <Tag className="size-2.5" />{tag}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#8C8880]">{formatDate(c.created_at)}</td>
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
