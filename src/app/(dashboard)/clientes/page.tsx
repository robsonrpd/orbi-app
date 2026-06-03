import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import Link from 'next/link'
import { UserPlus, Download, Phone, Tag, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const { data: contacts } = await service
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Clientes" subtitle={`${contacts?.length ?? 0} clientes cadastrados`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-[#EAE8E1]">
          {/* Header da tabela */}
          <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
              Todos os clientes
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs border-[#EAE8E1] text-[#8C8880] hover:text-[#2E2D29] gap-1.5">
                <Download className="size-3.5" /> Exportar CSV
              </Button>
              <Button size="sm" className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
                <UserPlus className="size-3.5" /> Novo cliente
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EAE8E1]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Telefone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Tags</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>Cadastrado em</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE8E1]">
              {(contacts ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-[#8C8880]">
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              ) : (
                (contacts ?? []).map((c) => (
                  <tr key={c.id} className="hover:bg-[#F7F6F3] transition-colors group">
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
                        <Phone className="size-3.5 text-[#C8C5BB]" />
                        {c.phone}
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
                    <td className="px-5 py-3.5 text-sm text-[#8C8880]">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/clientes/${c.id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-[#1A56FF] font-medium">
                        Ver ficha <ChevronRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
