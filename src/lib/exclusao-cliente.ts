import { createServiceClient } from '@/lib/supabase/server'
import { deletarInstancia, listarInstancias } from '@/lib/evolution'

type Service = ReturnType<typeof createServiceClient>

// Exclusão DEFINITIVA de um cliente (loja). Não existe "desfazer" e não há backup: a loja, os leads,
// as conversas, os logins e a conexão do WhatsApp somem. Por isso:
//  - quem chama (a ação do painel do fundador) exige o nome digitado e ser super-admin;
//  - aqui dentro há uma trava própria: a loja que tem a conta de um super-admin NÃO é excluída
//    (apagar a própria conta de fundador trancaria você pra fora do painel).

const superAdmins = () => (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export type ResumoExclusao = {
  id: string
  nome: string
  slug: string
  leads: number
  conversas: number
  usuarios: { id: string; email: string; role: string }[]
  conexoes: { nome: string; estado: string }[]
  /** o Evolution respondeu? Se não, a lista de conexões pode estar incompleta */
  conexoesVerificadas: boolean
  /** motivo pelo qual esta loja NÃO pode ser excluída (null = pode) */
  protegida: string | null
}

async function contar(service: Service, tabela: string, companyId: string) {
  const { count } = await service.from(tabela).select('id', { count: 'exact', head: true }).eq('company_id', companyId)
  return count ?? 0
}

/** Conexões do WhatsApp que pertencem à loja: a configurada + qualquer outra com o mesmo slug (sobras). */
async function conexoesDaLoja(slug: string, configurada: string | null) {
  const { ok, estados } = await listarInstancias()
  if (!ok) return { verificadas: false, lista: configurada ? [{ nome: configurada, estado: 'desconhecido' }] : [] }
  const lista = [...estados.entries()]
    .filter(([nome]) => nome === configurada || nome.replace(/-[a-z0-9]+$/i, '') === slug) // mesma regra do webhook
    .map(([nome, estado]) => ({ nome, estado }))
  return { verificadas: true, lista }
}

export async function resumirCliente(service: Service, companyId: string): Promise<ResumoExclusao | null> {
  const { data: emp } = await service.from('companies').select('id, name, slug, settings').eq('id', companyId).maybeSingle()
  if (!emp) return null
  const { data: us } = await service.from('users').select('id, email, role').eq('company_id', companyId)
  const usuarios = (us ?? []) as { id: string; email: string; role: string }[]
  const donos = superAdmins()
  const fundador = usuarios.find(u => donos.includes((u.email ?? '').toLowerCase()))
  const conexoes = await conexoesDaLoja(emp.slug as string, ((emp.settings ?? {}) as { wa_instance?: string }).wa_instance ?? null)

  return {
    id: emp.id as string, nome: emp.name as string, slug: emp.slug as string,
    leads: await contar(service, 'contacts', companyId),
    conversas: await contar(service, 'conversations', companyId),
    usuarios, conexoes: conexoes.lista, conexoesVerificadas: conexoes.verificadas,
    protegida: fundador ? `Esta loja tem a conta do fundador (${fundador.email}). Excluí-la apagaria o seu acesso ao painel.` : null,
  }
}

/** Remove todos os arquivos de uma "pasta" do Storage, descendo nas subpastas e paginando (uma pasta pode ter milhares de fotos). */
export async function removerPasta(service: Service, bucket: string, prefixo: string, tamanhoPagina = 1000): Promise<number> {
  let removidos = 0
  for (let guarda = 0; guarda < 200; guarda++) {
    const { data, error } = await service.storage.from(bucket).list(prefixo, { limit: tamanhoPagina })
    if (error || !data?.length) break
    const arquivos: string[] = []
    for (const item of data) {
      if (item.id) arquivos.push(`${prefixo}/${item.name}`)                                   // arquivo
      else removidos += await removerPasta(service, bucket, `${prefixo}/${item.name}`, tamanhoPagina) // subpasta
    }
    if (arquivos.length) {
      const { error: e2 } = await service.storage.from(bucket).remove(arquivos)
      if (e2) { console.error('[exclusao] remover arquivos:', e2.message); break }
      removidos += arquivos.length
    }
    // só continua se a página veio cheia: removemos o que listamos, então a próxima listagem traz o resto
    if (data.length < tamanhoPagina) break
  }
  return removidos
}

export type ResultadoExclusao = {
  nome: string
  leads: number
  conversas: number
  usuariosRemovidos: number
  usuariosMantidos: number
  conexoesRemovidas: string[]
  conexoesFalharam: string[]
  conexoesVerificadas: boolean
  arquivos: number
}

export async function excluirClienteDefinitivo(
  service: Service, companyId: string,
): Promise<{ ok: true; resultado: ResultadoExclusao } | { ok: false; erro: string }> {
  const resumo = await resumirCliente(service, companyId)
  if (!resumo) return { ok: false, erro: 'Cliente não encontrado.' }
  if (resumo.protegida) return { ok: false, erro: resumo.protegida }

  // 1) WhatsApp: desvincula o aparelho e apaga a conexão. Falha aqui NÃO impede o resto (o Evolution
  //    tem uma falha conhecida ao apagar conexões travadas) — mas é informada, pra não ficar sobra escondida.
  const conexoesRemovidas: string[] = []
  const conexoesFalharam: string[] = []
  for (const c of resumo.conexoes) {
    try { await deletarInstancia(c.nome) } catch { /* conferido logo abaixo */ }
  }
  if (resumo.conexoes.length) {
    await new Promise(r => setTimeout(r, 1500))
    const { ok, estados } = await listarInstancias()
    for (const c of resumo.conexoes) (ok && !estados.has(c.nome) ? conexoesRemovidas : conexoesFalharam).push(c.nome)
  }

  // 2) Arquivos da loja (fotos de perfil, mídia recebida pelo WhatsApp, logo)
  const arquivos = await removerPasta(service, 'fotos', companyId)

  // 3) Logins. Quem também pertence a OUTRA loja (conta com várias lojas) é mantido e passa a usar a outra.
  let usuariosRemovidos = 0, usuariosMantidos = 0
  for (const u of resumo.usuarios) {
    const { data: outras } = await service.from('company_members').select('company_id').eq('user_id', u.id).neq('company_id', companyId).limit(1)
    const outra = outras?.[0]?.company_id as string | undefined
    if (outra) {
      await service.from('users').update({ company_id: outra }).eq('id', u.id)
      usuariosMantidos++
      continue
    }
    const { error } = await service.auth.admin.deleteUser(u.id)
    if (error) console.error('[exclusao] apagar usuário:', u.email, error.message); else usuariosRemovidos++
  }

  // 4) A loja. Leads, conversas, vendedores, anotações etc. saem em cascata.
  const { error } = await service.from('companies').delete().eq('id', companyId)
  if (error) return { ok: false, erro: `Parte foi apagada, mas a loja não: ${error.message}. Tente de novo.` }

  return {
    ok: true,
    resultado: {
      nome: resumo.nome, leads: resumo.leads, conversas: resumo.conversas, usuariosRemovidos, usuariosMantidos,
      conexoesRemovidas, conexoesFalharam, conexoesVerificadas: resumo.conexoesVerificadas, arquivos,
    },
  }
}
