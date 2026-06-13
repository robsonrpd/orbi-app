import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { Topbar } from '@/components/orbi/topbar'
import { FunilClient } from './funil-client'

type Msg = { role: string; content: string }

export default async function FunilPage() {
  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: contacts }, { data: convs }, { data: vendedores }] = await Promise.all([
    service.from('contacts')
      .select('id, name, phone, email, origem, tags, notes, funil_etapa, funil_valor, responsavel_id, qualificacao, negociacao_status, created_at')
      .eq('company_id', companyId).eq('active', true).order('created_at', { ascending: false }),
    service.from('conversations').select('id, numero, messages, last_message_at').eq('company_id', companyId),
    service.from('vendedores').select('id, nome').eq('company_id', companyId).eq('active', true).order('nome'),
  ])

  // tabelas novas — toleram não existir ainda
  let tarefas: { id: string; contact_id: string; titulo: string; vence_em: string | null; feito: boolean }[] = []
  let anotacoes: { id: string; contact_id: string; texto: string; created_at: string }[] = []
  let msgsProntas: { id: string; titulo: string; texto: string }[] = []
  let produtos: { id: string; contact_id: string; nome: string; quantidade: number; preco: number; desconto: number }[] = []
  try { tarefas = ((await service.from('lead_tarefas').select('id, contact_id, titulo, vence_em, feito').eq('company_id', companyId).order('vence_em')).data ?? []) as never } catch {}
  try { anotacoes = ((await service.from('lead_anotacoes').select('id, contact_id, texto, created_at').eq('company_id', companyId).order('created_at', { ascending: false })).data ?? []) as never } catch {}
  try { msgsProntas = ((await service.from('mensagens_prontas').select('id, titulo, texto').eq('company_id', companyId).order('titulo')).data ?? []) as never } catch {}
  try { produtos = ((await service.from('lead_produtos').select('id, contact_id, nome, quantidade, preco, desconto').eq('company_id', companyId)).data ?? []) as never } catch {}

  const convPorChave = new Map<string, { id: string; messages: Msg[]; last_message_at: string }>()
  for (const c of convs ?? []) {
    const k = (c.numero ?? '').replace(/\D/g, '').slice(-8)
    if (k) convPorChave.set(k, { id: c.id as string, messages: (c.messages as Msg[]) ?? [], last_message_at: c.last_message_at as string })
  }

  const leads = (contacts ?? []).map(l => {
    const k = (l.phone ?? '').replace(/\D/g, '').slice(-8)
    const conv = k ? convPorChave.get(k) : undefined
    return {
      ...l,
      conversaId: conv?.id ?? null,
      messages: conv?.messages ?? [],
      lastMessageAt: conv?.last_message_at ?? null,
      tarefas: tarefas.filter(t => t.contact_id === l.id),
      anotacoes: anotacoes.filter(a => a.contact_id === l.id),
      produtos: produtos.filter(p => p.contact_id === l.id),
    }
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Funil de Leads" subtitle="Seu CRM — acompanhe e converse com cada lead" />
      <div className="flex-1 overflow-hidden p-6">
        <FunilClient leads={leads as never} vendedores={vendedores ?? []} msgsProntas={msgsProntas} />
      </div>
    </div>
  )
}
