import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { NICHO_KEYS, NICHO_DEFAULT } from '@/lib/nichos'
import { codigoPareceValido, hashCodigo } from '@/lib/claim'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'empresa'
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verifica sessão autenticada — nunca aceita userId do cliente
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { name, companyName, phone, businessType, codigo } = await req.json()
    const ramo = NICHO_KEYS.includes(businessType) ? businessType : NICHO_DEFAULT

    const service = createServiceClient()

    // 2. Garante que o user ainda não tem empresa (evita duplicação)
    const { data: existing } = await service
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existing) {
      // Usuário já configurado — retorna sucesso silencioso
      return NextResponse.json({ ok: true })
    }

    // 2b. Código de loja: o dono de uma loja que JÁ existe (com leads e WhatsApp ligados) assume ela
    // em vez de criar uma nova e vazia. Uso único.
    if (typeof codigo === 'string' && codigo.trim()) {
      if (!codigoPareceValido(codigo)) return NextResponse.json({ error: 'Código da loja inválido ou já usado.' }, { status: 400 })
      const hash = hashCodigo(codigo)

      const { data: alvo } = await service.from('companies').select('id, name, settings')
        .eq('settings->>claim_hash', hash).maybeSingle()
      if (!alvo) return NextResponse.json({ error: 'Código da loja inválido ou já usado.' }, { status: 400 })

      const settingsOriginais = (alvo.settings ?? {}) as Record<string, unknown>
      const donoFone = (phone ?? '').replace(/\D/g, '')
      const settingsNovos: Record<string, unknown> = { ...settingsOriginais, ...(donoFone ? { owner_phone: donoFone } : {}) }
      delete settingsNovos.claim_hash

      // atômico: o UPDATE só acerta se o hash AINDA estiver lá. Dois cadastros ao mesmo tempo com o
      // mesmo código: só um passa, o outro recebe 0 linhas.
      const { data: assumida } = await service.from('companies').update({ settings: settingsNovos })
        .eq('id', alvo.id).eq('settings->>claim_hash', hash).select('id')
      if (!assumida?.length) return NextResponse.json({ error: 'Este código acabou de ser usado por outra pessoa.' }, { status: 409 })

      const { error: erroUsuario } = await service.from('users').insert({
        id: user.id,           // sempre do token JWT, nunca do body
        company_id: alvo.id,
        email: user.email!,    // sempre do token JWT, nunca do body
        name: name || '',
        role: 'admin',
      })
      if (erroUsuario) {
        console.error('Erro ao vincular usuário à loja:', erroUsuario)
        // devolve o código: a pessoa pode tentar de novo sem pedir outro
        await service.from('companies').update({ settings: settingsOriginais }).eq('id', alvo.id)
        return NextResponse.json({ error: 'Erro ao vincular a conta à loja.' }, { status: 500 })
      }

      const admins = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
      for (const adminEmail of admins) {
        await sendEmail({
          to: adminEmail,
          subject: `🔑 Loja assumida no Orbi: ${alvo.name}`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><h2 style="color:#1A56FF">Um dono assumiu a loja dele</h2>
            <p style="background:#F0F2F5;padding:14px;border-radius:10px"><strong>Loja:</strong> ${alvo.name}<br/><strong>Nome:</strong> ${name || '-'}<br/>
            <strong>E-mail:</strong> ${user.email}<br/><strong>WhatsApp:</strong> ${donoFone || '-'}</p></div>`,
        })
      }
      return NextResponse.json({ ok: true, companyId: alvo.id, lojaExistente: true })
    }

    const slug = toSlug(companyName || 'empresa') + '-' + user.id.slice(0, 6)

    // 3. Cria a empresa (guarda telefone do dono em settings para suporte)
    const ownerPhone = (phone ?? '').replace(/\D/g, '')
    const { data: company, error: companyError } = await service
      .from('companies')
      .insert({
        name: companyName || 'Minha Empresa',
        slug,
        business_type: ramo,
        settings: ownerPhone ? { owner_phone: ownerPhone } : {},
      })
      .select()
      .single()

    if (companyError) {
      console.error('Erro ao criar empresa:', companyError)
      return NextResponse.json({ error: 'Erro ao criar empresa.' }, { status: 500 })
    }

    // 4. Cria o usuário vinculado à empresa
    const { error: userError } = await service
      .from('users')
      .insert({
        id: user.id,           // sempre do token JWT, nunca do body
        company_id: company.id,
        email: user.email!,    // sempre do token JWT, nunca do body
        name: name || '',
        role: 'admin',
      })

    if (userError) {
      console.error('Erro ao criar usuário:', userError)
      await service.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
    }

    // 5. Notifica os super-admins sobre o novo cadastro (lead)
    const admins = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
    for (const adminEmail of admins) {
      await sendEmail({
        to: adminEmail,
        subject: `🎉 Novo cadastro no Orbi: ${companyName || 'Sem nome'}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#1A56FF">Novo lead cadastrado!</h2>
            <p style="background:#F0F2F5;padding:14px;border-radius:10px">
              <strong>Nome:</strong> ${name || '-'}<br/>
              <strong>Negócio:</strong> ${companyName || '-'}<br/>
              <strong>Ramo:</strong> ${ramo}<br/>
              <strong>E-mail:</strong> ${user.email}<br/>
              <strong>WhatsApp:</strong> ${ownerPhone || '-'}
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ ok: true, companyId: company.id })
  } catch (err) {
    console.error('Erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
