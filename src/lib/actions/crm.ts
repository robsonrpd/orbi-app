'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarTexto, enviarMedia, enviarAudio } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

/** Resolve instância + número do lead e registra uma mensagem na conversa. */
async function envioBase(companyId: string, contactId: string) {
  const service = createServiceClient()
  const { data: contact } = await service.from('contacts').select('phone').eq('id', contactId).eq('company_id', companyId).single()
  if (!contact?.phone) return null
  const { data: comp } = await service.from('companies').select('settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string })?.wa_instance
  if (!instance) return null
  const d = (contact.phone || '').replace(/\D/g, '')
  return { service, instance, numero: d.startsWith('55') ? d : `55${d}` }
}

async function logConversa(service: ReturnType<typeof createServiceClient>, companyId: string, contactId: string, numero: string, content: string) {
  const chave = numero.slice(-8)
  const { data: convs } = await service.from('conversations').select('id, numero, messages').eq('company_id', companyId)
  const conv = (convs ?? []).find(c => (c.numero ?? '').replace(/\D/g, '').slice(-8) === chave)
  const nova = { role: 'human', content }
  if (conv) {
    const messages = [...((conv.messages as { role: string; content: string }[]) ?? []), nova].slice(-60)
    await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', conv.id)
  } else {
    await service.from('conversations').insert({ company_id: companyId, contact_id: contactId, numero, messages: [nova], handled_by_ai: false, last_message_at: new Date().toISOString() } as never)
  }
}

/** Envia um arquivo/imagem (URL) ao lead pelo WhatsApp. */
export async function enviarArquivoLead(contactId: string, url: string, mediatype: string, fileName: string, caption?: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const base = await envioBase(companyId, contactId)
  if (!base) return { error: 'WhatsApp não conectado ou lead sem telefone.' }
  const env = await enviarMedia(base.instance, base.numero, { mediatype, media: url, fileName, caption })
  if (!env.ok) return { error: 'Falha ao enviar o arquivo.' }
  await logConversa(base.service, companyId, contactId, base.numero, mediatype === 'image' ? '📷 Imagem enviada' : `📎 ${fileName}`)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/** Envia um áudio (URL) ao lead pelo WhatsApp. */
export async function enviarAudioLead(contactId: string, url: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const base = await envioBase(companyId, contactId)
  if (!base) return { error: 'WhatsApp não conectado ou lead sem telefone.' }
  const env = await enviarAudio(base.instance, base.numero, url)
  if (!env.ok) return { error: 'Falha ao enviar o áudio.' }
  await logConversa(base.service, companyId, contactId, base.numero, '🎤 Áudio enviado')
  revalidatePath('/dashboard/funil')
  return { success: true }
}

function fmtBR(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }

/* ---------- Qualificação (estrelas) e Status da negociação ---------- */
export async function setQualificacao(contactId: string, estrelas: number) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('contacts').update({ qualificacao: Math.max(0, Math.min(5, estrelas)) } as never).eq('id', contactId).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

export async function setStatusNegociacao(contactId: string, status: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const validos = ['aberta', 'vendida', 'perdida', 'pendente']
  if (!validos.includes(status)) return { error: 'Status inválido.' }
  const service = createServiceClient()
  await service.from('contacts').update({ negociacao_status: status } as never).eq('id', contactId).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Produtos do lead ---------- */
export async function addProdutoLead(contactId: string, p: { nome: string; quantidade: number; preco: number; desconto: number }) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!p.nome.trim()) return { error: 'Informe o produto.' }
  const service = createServiceClient()
  const { data, error } = await service.from('lead_produtos').insert({
    company_id: companyId, contact_id: contactId, nome: p.nome.trim(),
    quantidade: p.quantidade || 1, preco: p.preco || 0, desconto: p.desconto || 0,
  } as never).select('id, nome, quantidade, preco, desconto').single()
  if (error) return { error: 'Erro ao adicionar produto.' }
  revalidatePath('/dashboard/funil')
  return { success: true, produto: data }
}

export async function delProdutoLead(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('lead_produtos').delete().eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/** Monta um mini-orçamento dos produtos e envia pelo WhatsApp do lead. */
export async function enviarOrcamentoLead(contactId: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { data: contact } = await service.from('contacts').select('phone').eq('id', contactId).eq('company_id', companyId).single()
  if (!contact?.phone) return { error: 'Lead sem telefone.' }
  const { data: comp } = await service.from('companies').select('name, settings').eq('id', companyId).single()
  const instance = (comp?.settings as { wa_instance?: string })?.wa_instance
  if (!instance) return { error: 'WhatsApp não conectado.' }
  const { data: itens } = await service.from('lead_produtos').select('nome, quantidade, preco, desconto').eq('contact_id', contactId).eq('company_id', companyId)
  if (!itens?.length) return { error: 'Adicione produtos primeiro.' }

  let total = 0
  const linhas = itens.map(i => {
    const sub = Number(i.quantidade) * Number(i.preco) - Number(i.desconto)
    total += sub
    return `• ${i.quantidade}x ${i.nome} — ${fmtBR(sub)}`
  })
  const texto = `*Orçamento — ${comp?.name ?? 'Nossa loja'}*\n\n${linhas.join('\n')}\n\n*Total: ${fmtBR(total)}*\n\nQualquer dúvida, é só chamar! 😊`

  const d = (contact.phone || '').replace(/\D/g, '')
  const numero = d.startsWith('55') ? d : `55${d}`
  const env = await enviarTexto(instance, numero, texto)
  if (!env.ok) return { error: 'Falha ao enviar pelo WhatsApp.' }

  // registra na conversa
  const chave = numero.slice(-8)
  const { data: convs } = await service.from('conversations').select('id, numero, messages').eq('company_id', companyId)
  const conv = (convs ?? []).find(c => (c.numero ?? '').replace(/\D/g, '').slice(-8) === chave)
  const nova = { role: 'human', content: texto }
  if (conv) {
    const messages = [...((conv.messages as { role: string; content: string }[]) ?? []), nova].slice(-60)
    await service.from('conversations').update({ messages, handled_by_ai: false, last_message_at: new Date().toISOString() }).eq('id', conv.id)
  } else {
    await service.from('conversations').insert({ company_id: companyId, contact_id: contactId, numero, messages: [nova], handled_by_ai: false, last_message_at: new Date().toISOString() } as never)
  }
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Responsável ---------- */
export async function setResponsavel(contactId: string, vendedorId: string | null) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  const { error } = await service.from('contacts')
    .update({ responsavel_id: vendedorId } as never).eq('id', contactId).eq('company_id', companyId)
  if (error) return { error: 'Erro ao salvar responsável.' }
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Tarefas ---------- */
export async function criarTarefa(contactId: string, titulo: string, venceEm: string | null) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!titulo.trim()) return { error: 'Descreva a tarefa.' }
  const service = createServiceClient()
  const { data, error } = await service.from('lead_tarefas').insert({
    company_id: companyId, contact_id: contactId, titulo: titulo.trim(), vence_em: venceEm || null,
  } as never).select('id, titulo, vence_em, feito, created_at').single()
  if (error) return { error: 'Erro ao criar tarefa.' }
  revalidatePath('/dashboard/funil')
  return { success: true, tarefa: data }
}

export async function toggleTarefa(id: string, feito: boolean) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('lead_tarefas').update({ feito } as never).eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

export async function excluirTarefa(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('lead_tarefas').delete().eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Anotações ---------- */
export async function criarAnotacao(contactId: string, texto: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!texto.trim()) return { error: 'Escreva a anotação.' }
  const service = createServiceClient()
  const { data, error } = await service.from('lead_anotacoes').insert({
    company_id: companyId, contact_id: contactId, texto: texto.trim(),
  } as never).select('id, texto, created_at').single()
  if (error) return { error: 'Erro ao salvar anotação.' }
  revalidatePath('/dashboard/funil')
  return { success: true, anotacao: data }
}

export async function excluirAnotacao(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('lead_anotacoes').delete().eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}

/* ---------- Mensagens prontas ---------- */
export async function criarMsgPronta(titulo: string, texto: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  if (!titulo.trim() || !texto.trim()) return { error: 'Preencha título e texto.' }
  const service = createServiceClient()
  const { data, error } = await service.from('mensagens_prontas').insert({
    company_id: companyId, titulo: titulo.trim(), texto: texto.trim(),
  } as never).select('id, titulo, texto').single()
  if (error) return { error: 'Erro ao salvar mensagem.' }
  revalidatePath('/dashboard/funil')
  return { success: true, msg: data }
}

export async function excluirMsgPronta(id: string) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const service = createServiceClient()
  await service.from('mensagens_prontas').delete().eq('id', id).eq('company_id', companyId)
  revalidatePath('/dashboard/funil')
  return { success: true }
}
