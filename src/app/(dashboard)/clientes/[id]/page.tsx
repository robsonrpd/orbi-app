import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { AppointmentBadge, TransactionBadge } from '@/components/orbi/status-badge'
import { notFound } from 'next/navigation'
import { Phone, MessageSquare, Calendar, DollarSign, Tag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatDateTime(s: string) {
  return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const service = createServiceClient()

  // Busca company_id do usuário logado
  const { data: userData } = await service
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) notFound()

  // SEGURANÇA: valida que o contato pertence à empresa do usuário logado
  const { data: contact } = await service
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('company_id', userData.company_id) // isolamento multi-tenant
    .single()

  if (!contact) notFound() // 404 para contatos de outras empresas também

  const [{ data: appointments }, { data: transactions }] = await Promise.all([
    service.from('appointments')
      .select('*, services(name)')
      .eq('contact_id', id)
      .eq('company_id', userData.company_id) // reforço multi-tenant
      .order('start_at', { ascending: false })
      .limit(10),
    service.from('transactions')
      .select('*')
      .eq('contact_id', id)
      .eq('company_id', userData.company_id) // reforço multi-tenant
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const totalGasto = (transactions ?? []).filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title={contact.name ?? contact.phone} subtitle="Ficha do cliente" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <Link href="/dashboard/clientes" className="inline-flex items-center gap-1.5 text-sm text-[#8C8880] hover:text-[#1A56FF] transition-colors">
          <ArrowLeft className="size-3.5" /> Voltar para clientes
        </Link>

        <div className="grid grid-cols-3 gap-5">
          {/* Dados do contato */}
          <div className="bg-white rounded-xl border border-[#EAE8E1] p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xl font-bold text-[#1A56FF]">
                {(contact.name ?? contact.phone)[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                  {contact.name ?? 'Sem nome'}
                </h2>
                <p className="text-sm text-[#8C8880]">Cliente desde {formatDate(contact.created_at)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#F7F6F3] rounded-lg">
                <Phone className="size-4 text-[#8C8880]" />
                <span className="text-sm text-[#2E2D29]">{contact.phone}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#F7F6F3] rounded-lg">
                <DollarSign className="size-4 text-[#0DB57A]" />
                <span className="text-sm text-[#2E2D29]">{formatCurrency(totalGasto)} no total</span>
              </div>
              {(contact.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(contact.tags ?? []).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF2FF] rounded-full text-xs text-[#1A56FF] border border-[#1A56FF]/20">
                      <Tag className="size-2.5" /> {tag}
                    </span>
                  ))}
                </div>
              )}
              {contact.notes && (
                <p className="text-xs text-[#8C8880] pt-1 border-t border-[#EAE8E1]">{contact.notes}</p>
              )}
            </div>

            <div className="mt-5">
              <Button className="w-full h-9 bg-[#1A56FF] hover:bg-[#1445DD] text-white text-xs gap-2">
                <MessageSquare className="size-3.5" /> Enviar mensagem
              </Button>
            </div>
          </div>

          {/* Agendamentos */}
          <div className="bg-white rounded-xl border border-[#EAE8E1]">
            <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center gap-2">
              <Calendar className="size-4 text-[#1A56FF]" />
              <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Agendamentos</h3>
            </div>
            <div className="divide-y divide-[#EAE8E1]">
              {(appointments ?? []).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#C8C5BB]">Nenhum agendamento</p>
              ) : (
                (appointments ?? []).map((a: Record<string, unknown>) => {
                  const svc = a.services as { name?: string } | null
                  return (
                    <div key={a.id as string} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#1C1B18]">{svc?.name ?? 'Serviço'}</p>
                        <p className="text-xs text-[#8C8880]">{formatDateTime(a.start_at as string)}</p>
                      </div>
                      <AppointmentBadge status={a.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'} />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Cobranças */}
          <div className="bg-white rounded-xl border border-[#EAE8E1]">
            <div className="px-5 py-4 border-b border-[#EAE8E1] flex items-center gap-2">
              <DollarSign className="size-4 text-[#0DB57A]" />
              <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Cobranças</h3>
            </div>
            <div className="divide-y divide-[#EAE8E1]">
              {(transactions ?? []).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#C8C5BB]">Nenhuma cobrança</p>
              ) : (
                (transactions ?? []).map((t: Record<string, unknown>) => (
                  <div key={t.id as string} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1C1B18]">{formatCurrency(Number(t.amount))}</p>
                      <p className="text-xs text-[#8C8880]">
                        {t.due_date ? `Venc. ${formatDate(t.due_date as string)}` : formatDate(t.created_at as string)}
                      </p>
                    </div>
                    <TransactionBadge status={t.status as 'pending' | 'paid' | 'overdue' | 'cancelled'} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
