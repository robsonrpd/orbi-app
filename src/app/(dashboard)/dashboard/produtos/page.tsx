import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { ProdutosClient } from './produtos-client'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()

  // Tenta buscar produtos — se tabela não existir retorna array vazio
  let products: unknown[] = []
  try {
    const { data } = await service.from('products' as never).select('*')
      .eq('company_id', userData?.company_id).eq('active', true).order('created_at')
    products = data ?? []
  } catch { products = [] }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Produtos" subtitle="Gerencie seu estoque de produtos" />
      <div className="flex-1 overflow-y-auto p-6">
        <ProdutosClient products={products as never} />
      </div>
    </div>
  )
}
