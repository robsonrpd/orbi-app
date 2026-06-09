import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const contactId = req.nextUrl.searchParams.get('contact_id')
  if (!contactId) return NextResponse.json([])

  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user.id).single()

  const { data } = await service
    .from('receitas')
    .select('id, data_receita, medico')
    .eq('contact_id', contactId)
    .eq('company_id', userData?.company_id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
