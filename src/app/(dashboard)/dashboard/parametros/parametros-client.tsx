'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { saveParametrosVenda } from '@/lib/actions/parametros'
import { Settings, Loader2, Check, User, Stethoscope, Eye, Package, MessageSquare } from 'lucide-react'

const SECOES = [
  {
    titulo: 'Cliente', icon: User, params: [
      { key: 'cliente_obrigatorio', label: 'Cliente obrigatório na venda', desc: 'Não permite finalizar venda sem cliente' },
      { key: 'verifica_cadastro', label: 'Verificar cadastro no início da venda', desc: 'Alerta se dados do cliente estão incompletos' },
    ]
  },
  {
    titulo: 'Vendedores', icon: User, params: [
      { key: 'segundo_vendedor', label: 'Permitir 2º vendedor na venda', desc: 'Divide a comissão entre dois vendedores' },
      { key: 'vendedor_obrigatorio', label: 'Vendedor obrigatório', desc: 'Exige informar o vendedor' },
    ]
  },
  {
    titulo: 'Receitas (RX)', icon: Eye, params: [
      { key: 'receita_obrigatoria', label: 'Receita obrigatória na O.S.', desc: 'Exige vincular receita em pedidos de óculos' },
      { key: 'abrir_receita_auto', label: 'Abrir receita automaticamente', desc: 'Abre o campo de receita ao iniciar a venda' },
      { key: 'uma_receita_por_venda', label: 'Apenas uma receita por venda', desc: 'Limita a uma receita por pedido' },
    ]
  },
  {
    titulo: 'Médico', icon: Stethoscope, params: [
      { key: 'medico_obrigatorio', label: 'Médico obrigatório na venda', desc: 'Exige informar o médico que prescreveu' },
      { key: 'somente_medico_crm', label: 'Exibir somente médicos com CRM', desc: 'Filtra apenas médicos com registro' },
    ]
  },
  {
    titulo: 'Estoque', icon: Package, params: [
      { key: 'bloquear_estoque_zero', label: 'Bloquear venda com estoque zerado', desc: 'Impede vender produto sem estoque' },
      { key: 'observacao_obrigatoria', label: 'Observação obrigatória na venda', desc: 'Exige preencher observações' },
    ]
  },
  {
    titulo: 'Mensagens automáticas', icon: MessageSquare, params: [
      { key: 'enviar_os_agradecimento', label: 'Enviar O.S. junto com agradecimento', desc: 'WhatsApp envia resumo do pedido ao cliente' },
      { key: 'avisar_status_producao', label: 'Avisar mudança de status no WhatsApp', desc: 'Avisa "óculos pronto" automaticamente' },
      { key: 'avisar_receita_vencida', label: 'Avisar receita vencida', desc: 'Lembra o cliente de revisar a vista após 1 ano' },
      { key: 'felicitar_aniversario', label: 'Felicitar aniversariantes', desc: 'Envia parabéns + oferta no aniversário' },
    ]
  },
]

export function ParametrosClient({ initial }: { initial: Record<string, boolean> }) {
  const [regras, setRegras] = useState<Record<string, boolean>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(key: string) {
    setRegras(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    await saveParametrosVenda(regras)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>Parâmetros de Venda</h2>
          <p className="text-sm text-[#8C8880] mt-0.5">Configure as regras de comportamento da sua ótica</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <><Check className="size-4" /> Salvo!</> : <><Check className="size-4" /> Salvar</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SECOES.map(secao => (
          <GlowCard key={secao.titulo}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#EAE8E1]">
                <secao.icon className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                <h3 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{secao.titulo}</h3>
              </div>
              <div className="space-y-3">
                {secao.params.map(p => (
                  <div key={p.key} className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#1C1B18]">{p.label}</p>
                      <p className="text-xs text-[#8C8880]">{p.desc}</p>
                    </div>
                    <button onClick={() => toggle(p.key)}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${regras[p.key] ? 'bg-[#1A56FF]' : 'bg-[#EAE8E1]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${regras[p.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  )
}
