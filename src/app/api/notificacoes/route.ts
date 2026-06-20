import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const notifs: unknown[] = []
  const mesAtual = new Date().getMonth() + 1
  const umAnoAtras = new Date(); umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1)

  const desde48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const [{ data: ordens }, { data: receitas }, { data: contacts }, { data: contas }, { data: agendamentosOnline }] = await Promise.all([
    service.from('ordens_servico').select('id, numero, status').eq('company_id', companyId).neq('status', 'entregue').neq('status', 'cancelada'),
    service.from('receitas').select('id, contacts(name, phone)').eq('company_id', companyId).lt('data_receita', umAnoAtras.toISOString().split('T')[0]),
    service.from('contacts').select('id, name, phone, data_nascimento').eq('company_id', companyId),
    service.from('contas_pagar' as never).select('id, descricao, valor, status, vencimento').eq('company_id', companyId).eq('status', 'pendente'),
    service.from('appointments').select('id, start_at, contacts(name)').eq('company_id', companyId).eq('notes', 'Agendado pelo cliente (link público)').gte('created_at', desde48h),
  ])

  // Novos agendamentos feitos pelo cliente no link público
  const novosOnline = (agendamentosOnline ?? []) as unknown as { id: string; start_at: string; contacts: { name: string | null }[] | { name: string | null } | null }[]
  if (novosOnline.length > 0) {
    const ultimo = novosOnline[novosOnline.length - 1]
    const contatoUltimo = Array.isArray(ultimo.contacts) ? ultimo.contacts[0] : ultimo.contacts
    const desc = novosOnline.length === 1
      ? `${contatoUltimo?.name ?? 'Cliente'} agendou para ${new Date(ultimo.start_at).toLocaleDateString('pt-BR')}`
      : 'Clientes agendaram direto pelo seu link'
    notifs.push({ tipo: 'agendamento', titulo: `${novosOnline.length} novo${novosOnline.length > 1 ? 's' : ''} agendamento${novosOnline.length > 1 ? 's' : ''} online`, desc, href: '/dashboard/agenda' })
  }

  // Entregas pendentes
  const pendentes = (ordens ?? []).length
  if (pendentes > 0) {
    notifs.push({ tipo: 'entrega', titulo: `${pendentes} entrega${pendentes > 1 ? 's' : ''} pendente${pendentes > 1 ? 's' : ''}`, desc: 'Óculos aguardando retirada ou produção', href: '/dashboard/ordens-servico' })
  }

  // Receitas vencidas
  const vencidas = (receitas ?? []).length
  if (vencidas > 0) {
    notifs.push({ tipo: 'receita', titulo: `${vencidas} receita${vencidas > 1 ? 's' : ''} vencida${vencidas > 1 ? 's' : ''}`, desc: 'Clientes para revisão da vista (oportunidade)', href: '/dashboard/receitas' })
  }

  // Aniversariantes do mês
  const aniversariantes = (contacts ?? []).filter(c => c.data_nascimento && new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1 === mesAtual)
  if (aniversariantes.length > 0) {
    notifs.push({ tipo: 'aniversario', titulo: `${aniversariantes.length} aniversariante${aniversariantes.length > 1 ? 's' : ''} este mês`, desc: 'Envie parabéns + oferta especial', href: '/dashboard/clientes' })
  }

  // Contas a pagar
  const ctsPagar = ((contas ?? []) as { id: string }[]).length
  if (ctsPagar > 0) {
    notifs.push({ tipo: 'conta', titulo: `${ctsPagar} conta${ctsPagar > 1 ? 's' : ''} a pagar`, desc: 'Pendências financeiras com fornecedores', href: '/dashboard/financeiro' })
  }

  return NextResponse.json(notifs)
}
