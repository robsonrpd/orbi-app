'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { salvarConfigIA } from '@/lib/actions/ia'
import { Bot, Save, Eye, Loader2, Zap } from 'lucide-react'

type Company = {
  id: string
  ai_name: string
  ai_context: string | null
  whatsapp_instance: string | null
  settings: Record<string, unknown>
} | null

export function IAConfigForm({ company }: { company: Company }) {
  const [aiName, setAiName] = useState(company?.ai_name ?? 'Assistente')
  const [aiContext, setAiContext] = useState(company?.ai_context ?? '')
  const [ownerPhone, setOwnerPhone] = useState((company?.settings?.owner_phone as string) ?? '')
  const [active, setActive] = useState(!(company?.settings?.ia_pausada as boolean))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const preview = `Você é um assistente virtual do negócio.
Seu nome é ${aiName}.

## SEU PAPEL
Você atende clientes pelo WhatsApp de forma rápida, simpática e precisa.

## INFORMAÇÕES DO NEGÓCIO
${aiContext || 'Sem informações adicionais configuradas.'}

## REGRAS OBRIGATÓRIAS
1. Responda SEMPRE em português brasileiro
2. Seja breve — máximo 3 parágrafos por resposta
3. Nunca invente informações sobre preços ou disponibilidade
4. Se não souber, diga: "Deixa eu confirmar com a equipe e te retorno em instantes"
5. Nunca mencione que você é uma IA, a menos que o cliente pergunte diretamente`

  async function handleSave() {
    setSaving(true); setError(null)
    const r = await salvarConfigIA({ aiName, aiContext, ownerPhone, ativa: active })
    setSaving(false)
    if (r?.error) { setError(r.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Configuração */}
      <div className="bg-white rounded-xl border border-[#EAE8E1] p-5 space-y-5">
        <div className="flex items-center justify-between pb-1 border-b border-[#EAE8E1]">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-[#1A56FF]" />
            <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
              Configuração do assistente
            </h2>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs text-[#8C8880]">IA ativa</span>
            <button
              onClick={() => setActive(!active)}
              title={active ? 'IA respondendo automaticamente' : 'IA pausada (não responde no WhatsApp)'}
              className={`relative w-10 h-5 rounded-full transition-colors ${active ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Nome do assistente</Label>
            <Input value={aiName} onChange={e => setAiName(e.target.value)}
              placeholder="Ex: Ju, Assistente, Ana..."
              className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            <p className="text-xs text-[#C8C5BB]">Como o assistente se apresenta aos clientes</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Telefone do dono (para escaladas)</Label>
            <Input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)}
              placeholder="55 85 99999-9999"
              className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            <p className="text-xs text-[#C8C5BB]">Notificado quando a IA escalar um atendimento</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-[#2E2D29]">Contexto da IA</Label>
          <textarea
            value={aiContext}
            onChange={e => setAiContext(e.target.value)}
            rows={10}
            placeholder={`Descreva o seu negócio aqui. Inclua:

• Horários de atendimento (ex: segunda a sexta, das 8h às 18h)
• Serviços oferecidos e preços (ex: Limpeza dental — R$150, 45min)
• Formas de pagamento aceitas
• Endereço completo
• As 5 perguntas mais frequentes dos seus clientes

Quanto mais detalhado, melhor a IA responderá.`}
            className="w-full resize-none rounded-lg border border-[#EAE8E1] p-3 text-sm text-[#2E2D29] placeholder:text-[#C8C5BB] focus:outline-none focus:ring-2 focus:ring-[#1A56FF] focus:ring-offset-0 leading-relaxed"
          />
          <p className="text-xs text-[#C8C5BB]">
            {aiContext.length} caracteres — quanto mais contexto, melhor o atendimento
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-sm text-[#1A56FF] font-medium hover:underline"
          >
            <Eye className="size-3.5" />
            {showPreview ? 'Ocultar' : 'Visualizar'} system prompt
          </button>
          <Button onClick={handleSave} disabled={saving}
            className="h-9 bg-[#1A56FF] hover:bg-[#1445DD] text-white text-sm gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? '✓ Salvo!' : <><Save className="size-4" /> Salvar alterações</>}
          </Button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}

        {showPreview && (
          <div className="bg-[#F7F6F3] rounded-lg p-4 border border-[#EAE8E1]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-3.5 text-[#1A56FF]" />
              <span className="text-xs font-semibold text-[#8C8880] uppercase tracking-wider" style={{ fontFamily: 'Barlow, sans-serif' }}>
                System Prompt gerado
              </span>
            </div>
            <pre className="text-xs text-[#2E2D29] whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-64">
              {preview}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
