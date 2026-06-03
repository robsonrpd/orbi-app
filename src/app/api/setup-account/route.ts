import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'empresa'
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email, name, companyName } = await req.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const slug = toSlug(companyName || 'empresa') + '-' + userId.slice(0, 6)

    // Cria a empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName || 'Minha Empresa', slug })
      .select()
      .single()

    if (companyError) {
      console.error('Erro ao criar empresa:', companyError)
      return NextResponse.json({ error: 'Erro ao criar empresa: ' + companyError.message }, { status: 500 })
    }

    // Cria o usuário vinculado à empresa
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        company_id: company.id,
        email,
        name: name || '',
        role: 'admin',
      })

    if (userError) {
      console.error('Erro ao criar usuário:', userError)
      // Rollback da empresa
      await supabase.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: 'Erro ao criar usuário: ' + userError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, companyId: company.id })
  } catch (err) {
    console.error('Erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
