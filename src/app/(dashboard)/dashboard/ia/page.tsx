import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/orbi/topbar'
import { IAConfigForm } from './ia-config-form'
import { IAPlayground } from '@/components/orbi/ia-playground'

export default async function IAPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()
  const { data: userData } = await service.from('users').select('company_id').eq('id', user!.id).single()
  const companyId = userData?.company_id

  const { data: company } = await service.from('companies').select('*').eq('id', companyId).single()

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F2F5]">
      <Topbar title="Inteligência IA" subtitle="Configure e teste o assistente do WhatsApp" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-6 items-start">
          {/* Configuração */}
          <div>
            <IAConfigForm company={company} />
          </div>
          {/* Playground de teste */}
          <div className="sticky top-0">
            <div className="mb-3">
              <h2 className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                Testar a IA
              </h2>
              <p className="text-sm text-[#8C8880]">Converse como se fosse um cliente e veja as respostas</p>
            </div>
            <IAPlayground aiName={company?.ai_name ?? 'Assistente'} />
          </div>
        </div>
      </div>
    </div>
  )
}
