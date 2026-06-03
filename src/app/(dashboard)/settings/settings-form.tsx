'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, User, CreditCard, Save, Loader2, Zap, Check } from 'lucide-react'

export function SettingsForm({ userData, userEmail }: { userData: Record<string, unknown> | null; userEmail: string }) {
  const company = userData?.companies as Record<string, unknown> | null
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const plan = (company?.plan as string) ?? 'essencial'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Plano atual */}
      <div className="bg-white rounded-xl border border-[#EAE8E1] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <CreditCard className="size-5 text-[#1A56FF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1C1B18]">Plano atual</p>
              <p className="text-xs text-[#8C8880]">
                {plan === 'pro' ? 'Pro — R$ 497/mês' : 'Essencial — R$ 297/mês'}
              </p>
            </div>
          </div>
          {plan !== 'pro' && (
            <Button size="sm" className="h-8 text-xs bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-1.5">
              <Zap className="size-3.5" /> Fazer upgrade para Pro
            </Button>
          )}
          {plan === 'pro' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0DB57A] bg-[#E6F9F3] px-3 py-1.5 rounded-full border border-[#0DB57A]/20">
              <Check className="size-3.5" /> Plano Pro ativo
            </span>
          )}
        </div>
      </div>

      {/* Dados do negócio */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-[#EAE8E1] p-5 space-y-5">
        <div className="flex items-center gap-2 pb-1 border-b border-[#EAE8E1]">
          <Building2 className="size-4 text-[#1A56FF]" />
          <h2 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
            Dados do negócio
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Nome do negócio</Label>
            <Input defaultValue={(company?.name as string) ?? ''}
              className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Instância WhatsApp</Label>
            <Input defaultValue={(company?.whatsapp_instance as string) ?? ''}
              placeholder="nome-da-instancia"
              className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            <p className="text-xs text-[#C8C5BB]">Nome da instância na Evolution API</p>
          </div>
        </div>

        <div className="border-t border-[#EAE8E1] pt-5">
          <div className="flex items-center gap-2 pb-3">
            <User className="size-4 text-[#1A56FF]" />
            <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
              Dados da conta
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#2E2D29]">Seu nome</Label>
              <Input defaultValue={(userData?.name as string) ?? ''}
                className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#2E2D29]">E-mail</Label>
              <Input value={userEmail} disabled
                className="h-10 border-[#EAE8E1] bg-[#F7F6F3] text-[#8C8880] cursor-not-allowed" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={saving}
            className="h-9 bg-[#1A56FF] hover:bg-[#1445DD] text-white text-sm gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> :
             saved ? '✓ Salvo!' :
             <><Save className="size-4" /> Salvar alterações</>}
          </Button>
        </div>
      </form>
    </div>
  )
}
