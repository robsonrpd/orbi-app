'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

/** Garante que quem chama é o DONO (role admin). Retorna o company_id. */
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }
  const service = createServiceClient()
  const { data: u } = await service.from('users').select('role, company_id').eq('id', user.id).single()
  if (u?.role !== 'admin') return { error: 'Apenas o dono pode gerenciar acessos.' as const }
  return { companyId: u.company_id as string }
}

/** Cria o login (e-mail + senha) de um vendedor e vincula à empresa com role 'vendedor'. */
export async function criarLoginVendedor(vendedorId: string, senha: string) {
  const a = await assertAdmin()
  if ('error' in a) return { error: a.error }
  if ((senha ?? '').length < 6) return { error: 'A senha precisa de ao menos 6 caracteres.' }

  const service = createServiceClient()
  const { data: v } = await service.from('vendedores')
    .select('id, nome, email').eq('id', vendedorId).eq('company_id', a.companyId).single()
  if (!v) return { error: 'Vendedor não encontrado.' }
  if (!v.email) return { error: 'Cadastre um e-mail no vendedor antes de criar o acesso.' }

  const { data: existing } = await service.from('users').select('id').eq('vendedor_id', vendedorId).maybeSingle()
  if (existing) return { error: 'Esse vendedor já tem acesso.' }

  const { data: created, error: cErr } = await service.auth.admin.createUser({
    email: v.email, password: senha, email_confirm: true,
    user_metadata: { name: v.nome },
  })
  if (cErr || !created?.user) {
    const msg = cErr?.message ?? ''
    return { error: msg.toLowerCase().includes('already') ? 'Já existe um usuário com esse e-mail.' : 'Erro ao criar acesso.' }
  }

  const { error: uErr } = await service.from('users').insert({
    id: created.user.id, company_id: a.companyId, email: v.email,
    name: v.nome, role: 'staff', vendedor_id: vendedorId,
  })
  if (uErr) {
    await service.auth.admin.deleteUser(created.user.id)
    console.error('vincular acesso:', uErr)
    return { error: 'Erro ao vincular o acesso.' }
  }

  // Envia as credenciais por e-mail (se o Resend estiver configurado)
  const loginUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/login'
  await sendEmail({
    to: v.email,
    subject: 'Seu acesso ao Orbi',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1A56FF">Bem-vindo ao Orbi 👋</h2>
        <p>Olá ${v.nome.split(' ')[0]}, seu acesso ao sistema foi criado:</p>
        <p style="background:#F0F2F5;padding:14px;border-radius:10px">
          <strong>E-mail:</strong> ${v.email}<br/>
          <strong>Senha:</strong> ${senha}
        </p>
        <p><a href="${loginUrl}" style="background:#1A56FF;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Entrar no Orbi</a></p>
        <p style="color:#8C8880;font-size:13px">Recomendamos trocar a senha no primeiro acesso.</p>
      </div>`,
  })

  revalidatePath('/dashboard/vendedores')
  return { success: true }
}

/** Remove o login de um vendedor (apaga o usuário do Auth + vínculo). */
export async function removerLoginVendedor(vendedorId: string) {
  const a = await assertAdmin()
  if ('error' in a) return { error: a.error }

  const service = createServiceClient()
  const { data: u } = await service.from('users')
    .select('id').eq('vendedor_id', vendedorId).eq('company_id', a.companyId).maybeSingle()
  if (!u) return { error: 'Esse vendedor não tem acesso.' }

  await service.from('users').delete().eq('id', u.id)
  await service.auth.admin.deleteUser(u.id)

  revalidatePath('/dashboard/vendedores')
  return { success: true }
}
