import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const companyId = await getEffectiveCompanyId()
  if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo.' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Imagem acima de 5MB.' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Arquivo não é uma imagem.' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const service = createServiceClient()
  const { error } = await service.storage.from('fotos').upload(path, file, {
    contentType: file.type, upsert: false,
  })
  if (error) {
    console.error('upload:', error)
    return NextResponse.json({ error: 'Erro ao enviar imagem. Verifique se o bucket "fotos" existe e é público.' }, { status: 500 })
  }

  const { data: pub } = service.storage.from('fotos').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl })
}
