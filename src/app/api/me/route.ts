import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const service = createServiceClient()
  const companyId = await getEffectiveCompanyId()

  const [{ data: userData }, { data: company }] = await Promise.all([
    service.from('users').select('name').eq('id', user.id).single(),
    service.from('companies').select('name, logo_url').eq('id', companyId).single(),
  ])

  return NextResponse.json({
    name: userData?.name ?? '',
    email: user.email,
    companyName: company?.name ?? '',
    logoUrl: company?.logo_url ?? null,
  })
}
