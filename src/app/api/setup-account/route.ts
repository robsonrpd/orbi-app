import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

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

    const { name, companyName, phone } = await req.json()

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

    const slug = toSlug(companyName || 'empresa') + '-' + user.id.slice(0, 6)

    // 3. Cria a empresa (guarda telefone do dono em settings para suporte/IA)
    const ownerPhone = (phone ?? '').replace(/\D/g, '')
    const { data: company, error: companyError } = await service
      .from('companies')
      .insert({
        name: companyName || 'Minha Empresa',
        slug,
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

    return NextResponse.json({ ok: true, companyId: company.id })
  } catch (err) {
    console.error('Erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
