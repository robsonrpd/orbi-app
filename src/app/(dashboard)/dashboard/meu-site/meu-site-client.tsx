'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { saveSiteConfig } from '@/lib/actions/site'
import type { SiteConfig } from '@/lib/actions/site-types'
import { Type, Palette, Phone, Save, Loader2, Check, MessageCircle, AtSign, MapPin } from 'lucide-react'

const TEMAS = [
  { nome: 'Orbi Azul', primaria: '#1A56FF', secundaria: '#1445DD' },
  { nome: 'Moderno', primaria: '#0F172A', secundaria: '#38BDF8' },
  { nome: 'Elegante', primaria: '#1C1B18', secundaria: '#D4AF37' },
  { nome: 'Esmeralda', primaria: '#0DB57A', secundaria: '#0A8C5F' },
  { nome: 'Vibrante', primaria: '#EF4444', secundaria: '#F59E0B' },
  { nome: 'Minimalista', primaria: '#475569', secundaria: '#94A3B8' },
]

export function MeuSiteClient({ initial, companyName }: { initial: SiteConfig; companyName: string }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await saveSiteConfig(form)
    setSaving(false)
    if (!('error' in res)) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <GlowCard>
        <div className="p-5">
          <p className="text-xs font-bold tracking-[2px] uppercase text-[#8C8880] mb-3" style={{ fontFamily: 'Barlow, sans-serif' }}>Prévia</p>
          <div className="rounded-2xl overflow-hidden border border-[#EAE8E1]">
            <div className="p-6 text-center" style={{ background: `linear-gradient(160deg, ${form.corPrimaria} 0%, ${form.corSecundaria} 100%)` }}>
              <p className="text-lg font-black text-white" style={{ fontFamily: 'Fraunces, serif' }}>
                {form.titulo || companyName || 'Sua empresa'}
              </p>
              {form.subtitulo && <p className="text-xs text-white/70 mt-1">{form.subtitulo}</p>}
            </div>
            <div className="bg-white p-4 flex items-center justify-center gap-2">
              <span className="h-9 px-4 rounded-full text-xs font-bold text-white flex items-center" style={{ background: form.corPrimaria }}>Agendar horário</span>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Identidade */}
      <GlowCard>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Type className="size-4 text-[#1A56FF]" />
            <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Identidade</h3>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2E2D29]">Título principal</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder={companyName || 'Nome do seu negócio'}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2E2D29]">Subtítulo</label>
            <input value={form.subtitulo} onChange={e => set('subtitulo', e.target.value.slice(0, 80))} placeholder="Ex: Cortes precisos, clientes satisfeitos."
              className="w-full h-10 px-3 mt-1 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
            <p className="text-[10px] text-[#C8C5BB] mt-1">{form.subtitulo.length}/80 caracteres</p>
          </div>
        </div>
      </GlowCard>

      {/* Aparência */}
      <GlowCard>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-[#1A56FF]" />
            <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Aparência</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TEMAS.map(t => {
              const ativo = form.corPrimaria === t.primaria && form.corSecundaria === t.secundaria
              return (
                <button key={t.nome} onClick={() => { set('corPrimaria', t.primaria); set('corSecundaria', t.secundaria) }}
                  className="rounded-xl border p-2.5 flex items-center gap-2 transition-all text-left"
                  style={{ borderColor: ativo ? t.primaria : '#EAE8E1', borderWidth: ativo ? 2 : 1, background: ativo ? '#F7F6F3' : '#fff' }}>
                  <div className="flex shrink-0">
                    <span className="w-4 h-6 rounded-l" style={{ background: t.primaria }} />
                    <span className="w-4 h-6 rounded-r" style={{ background: t.secundaria }} />
                  </div>
                  <span className="text-xs font-semibold text-[#1C1B18]">{t.nome}</span>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-[#2E2D29]">Cor primária</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.corPrimaria} onChange={e => set('corPrimaria', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-[#EAE8E1] cursor-pointer" />
                <input value={form.corPrimaria} onChange={e => set('corPrimaria', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#2E2D29]">Cor secundária</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.corSecundaria} onChange={e => set('corSecundaria', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-[#EAE8E1] cursor-pointer" />
                <input value={form.corSecundaria} onChange={e => set('corSecundaria', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
              </div>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Contato */}
      <GlowCard>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-[#1A56FF]" />
            <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Contato e localização</h3>
          </div>
          <p className="text-xs text-[#8C8880]">Exibidos como ícones na sua página pública de agendamento.</p>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2E2D29]"><MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp</label>
            <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(85) 99999-9999"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2E2D29]"><AtSign className="size-3.5" /> Instagram</label>
            <input value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@seunegocio"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2E2D29]"><MapPin className="size-3.5" /> Endereço</label>
            <input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua Exemplo, 123 - Bairro, Cidade"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF]" />
          </div>
        </div>
      </GlowCard>

      <button onClick={handleSave} disabled={saving}
        className="w-full sm:w-auto h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#1A56FF,#1445DD)', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <><Check className="size-4" /> Salvo!</> : <><Save className="size-4" /> Salvar alterações</>}
      </button>
    </div>
  )
}
