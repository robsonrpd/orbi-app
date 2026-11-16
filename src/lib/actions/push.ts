'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId as getCompanyId } from '@/lib/auth/company'
import { enviarPushEmpresa } from '@/lib/push'

type Inscricao = { endpoint?: string; keys?: { p256dh?: string; auth?: string } }

/** Guarda o "endereço" deste aparelho para receber aviso de mensagem nova da loja logada. */
export async function salvarInscricaoPush(sub: Inscricao, aparelho?: string, enviarTeste = true) {
  const companyId = await getCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }
  const endpoint = sub?.endpoint, p256dh = sub?.keys?.p256dh, auth = sub?.keys?.auth
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint)) return { error: 'Inscrição inválida.' }

  const { data: { user } } = await (await createClient()).auth.getUser()
  const service = createServiceClient()
  const { error } = await service.from('push_inscricoes' as never).upsert({
    company_id: companyId, user_id: user?.id ?? null, endpoint, p256dh, auth, aparelho: (aparelho ?? '').slice(0, 120) || null,
  } as never, { onConflict: 'endpoint' })
  if (error) { console.error('[push salvar]', error.message); return { error: 'Não foi possível ativar os avisos.' } }

  // aviso de teste: quem ativou vê na hora que está funcionando
  if (enviarTeste) await enviarPushEmpresa(service, companyId, {
    titulo: 'Avisos ativados ✅', corpo: 'Você vai receber um aviso aqui sempre que chegar mensagem nova no WhatsApp.', url: '/dashboard/conversas', tag: 'teste',
  }, user?.id)
  return { success: true as const }
}

/** Chave PÚBLICA de push (o navegador precisa dela para se inscrever). Lida no servidor, entregue sob pedido. */
export async function chavePublicaPush() {
  return process.env.VAPID_PUBLIC_KEY ?? ''
}

/** Para de mandar aviso para este aparelho. */
export async function removerInscricaoPush(endpoint: string) {
  const companyId = await getCompanyId()
  if (!companyId || !endpoint) return { error: 'Não autenticado.' }
  await createServiceClient().from('push_inscricoes' as never).delete().eq('endpoint', endpoint).eq('company_id', companyId)
  return { success: true as const }
}
