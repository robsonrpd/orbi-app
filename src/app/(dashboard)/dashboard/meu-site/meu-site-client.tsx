'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { saveSiteConfig } from '@/lib/actions/site'
import type { SiteConfig } from '@/lib/actions/site-types'
import QRCode from 'qrcode'
import {
  Type, Palette, Phone, Save, Loader2, Check, MessageCircle, AtSign, MapPin,
  Settings, ListOrdered, Megaphone, QrCode as QrCodeIcon, GripVertical, Download, Gift, Power,
} from 'lucide-react'

const TEMAS = [
  { nome: 'Orbi Azul', primaria: '#1A56FF', secundaria: '#1445DD' },
  { nome: 'Moderno', primaria: '#0F172A', secundaria: '#38BDF8' },
  { nome: 'Elegante', primaria: '#1C1B18', secundaria: '#D4AF37' },
  { nome: 'Esmeralda', primaria: '#0DB57A', secundaria: '#0A8C5F' },
  { nome: 'Vibrante', primaria: '#EF4444', secundaria: '#F59E0B' },
  { nome: 'Minimalista', primaria: '#475569', secundaria: '#94A3B8' },
]

const QR_PALETAS = [
  { dark: '#000000', light: '#FFFFFF' },
  { dark: '#1A56FF', light: '#EEF2FF' },
  { dark: '#8B4513', light: '#F5DEB3' },
  { dark: '#0DB57A', light: '#E6F9F3' },
  { dark: '#B45309', light: '#FEF3C7' },
  { dark: '#9D174D', light: '#FCE7F3' },
]

type Service = { id: string; name: string; price: number }
type Tab = 'geral' | 'aparencia' | 'informacoes' | 'ordem' | 'avisos' | 'qrcode'

const TABS: { key: Tab; label: string; icon: typeof Settings }[] = [
  { key: 'geral', label: 'Geral', icon: Settings },
  { key: 'aparencia', label: 'Aparência', icon: Palette },
  { key: 'informacoes', label: 'Informações', icon: Phone },
  { key: 'ordem', label: 'Ordem', icon: ListOrdered },
  { key: 'avisos', label: 'Avisos', icon: Megaphone },
  { key: 'qrcode', label: 'QR Code', icon: QrCodeIcon },
]

function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function MeuSiteClient({ initial, companyName, services, slug }: {
  initial: SiteConfig
  companyName: string
  services: Service[]
  slug: string
}) {
  const [tab, setTab] = useState<Tab>('geral')
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ordem, setOrdem] = useState<Service[]>(() => {
    const porId = new Map(services.map(s => [s.id, s]))
    const ordenados = initial.ordemServicos.map(id => porId.get(id)).filter((s): s is Service => !!s)
    const restantes = services.filter(s => !initial.ordemServicos.includes(s.id))
    return [...ordenados, ...restantes]
  })
  const dragIndex = useRef<number | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const link = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/agendar/${slug}` : `/agendar/${slug}`), [slug])

  useEffect(() => {
    QRCode.toDataURL(link, { color: { dark: form.qrCorFrente, light: form.qrCorFundo }, width: 280, margin: 1 })
      .then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [link, form.qrCorFrente, form.qrCorFundo])

  function set<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function persist(config: SiteConfig) {
    setSaving(true)
    const res = await saveSiteConfig(config)
    setSaving(false)
    if (!('error' in res)) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  function handleSave() { persist(form) }

  function handleDrop(index: number) {
    if (dragIndex.current === null || dragIndex.current === index) return
    const novaOrdem = [...ordem]
    const [item] = novaOrdem.splice(dragIndex.current, 1)
    novaOrdem.splice(index, 0, item)
    setOrdem(novaOrdem)
    dragIndex.current = null
    const novoConfig = { ...form, ordemServicos: novaOrdem.map(s => s.id) }
    setForm(novoConfig)
    persist(novoConfig)
  }

  function baixarQr() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qrcode-${slug}.png`
    a.click()
  }

  async function compartilharLink() {
    if (navigator.share) {
      try { await navigator.share({ title: companyName, url: link }) } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(link)
    }
  }

  async function handleDesativar(novoValor: boolean) {
    if (!novoValor && !window.confirm('Desativar a página de agendamentos? Seus clientes não vão conseguir mais agendar pelo link até você reativar.')) return
    set('paginaAtiva', novoValor)
    persist({ ...form, paginaAtiva: novoValor })
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

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-[#EAE8E1] p-1.5">
        {TABS.map(t => {
          const ativo = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0"
              style={{ background: ativo ? '#1C1B18' : 'transparent', color: ativo ? '#fff' : '#8C8880' }}>
              <t.icon className="size-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'geral' && (
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
      )}

      {tab === 'aparencia' && (
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
      )}

      {tab === 'informacoes' && (
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
      )}

      {tab === 'ordem' && (
        <GlowCard>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="size-4 text-[#1A56FF]" />
                <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Ordem dos serviços</h3>
              </div>
              <span className="text-[10px] font-bold text-[#8C8880] uppercase">{ordem.length} serviços</span>
            </div>
            <p className="text-xs text-[#8C8880]">Arraste para definir como os serviços aparecem na página pública.</p>
            {ordem.length === 0 && <p className="text-sm text-[#8C8880] text-center py-6">Nenhum serviço cadastrado.</p>}
            <div className="space-y-2">
              {ordem.map((s, i) => (
                <div key={s.id} draggable
                  onDragStart={() => { dragIndex.current = i }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[#EAE8E1] bg-white cursor-move">
                  <GripVertical className="size-4 text-[#C8C5BB] shrink-0" />
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: form.corPrimaria }}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#1C1B18]">{s.name}</p>
                    <p className="text-xs text-[#8C8880]">{fmtMoney(s.price)}</p>
                  </div>
                </div>
              ))}
            </div>
            {saved && (
              <div className="flex items-center gap-1.5 justify-center text-xs font-bold text-[#0DB57A] bg-[#E6F9F3] rounded-full py-2">
                <Check className="size-3.5" /> Ordem salva automaticamente
              </div>
            )}
          </div>
        </GlowCard>
      )}

      {tab === 'avisos' && (
        <div className="space-y-5">
          <GlowCard>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="size-4 text-[#1A56FF]" />
                  <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Barra de aviso</h3>
                </div>
                <button onClick={() => set('avisoAtivo', !form.avisoAtivo)}
                  className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                  style={{ background: form.avisoAtivo ? '#0DB57A' : '#EAE8E1' }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: form.avisoAtivo ? '22px' : '2px' }} />
                </button>
              </div>
              <p className="text-xs text-[#8C8880]">Exibe uma barra verde no topo da página pública para comunicar algo importante aos clientes.</p>
              <div>
                <label className="text-xs font-semibold text-[#2E2D29]">Texto do aviso</label>
                <textarea value={form.avisoTexto} onChange={e => set('avisoTexto', e.target.value.slice(0, 300))} rows={3}
                  placeholder="Ex: Fechado hoje por feriado. Retornamos na segunda-feira!"
                  className="w-full px-3 py-2 mt-1 rounded-lg border border-[#EAE8E1] text-sm outline-none focus:border-[#1A56FF] resize-none" />
                <p className="text-[10px] text-[#C8C5BB] mt-1 text-right">{form.avisoTexto.length}/300 caracteres</p>
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Power className="size-4" style={{ color: form.paginaAtiva ? '#0DB57A' : '#EF4444' }} />
                  <h3 className="text-sm font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
                    {form.paginaAtiva ? 'Página ativa' : 'Página desativada'}
                  </h3>
                </div>
                <button onClick={() => handleDesativar(!form.paginaAtiva)}
                  className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                  style={{ background: form.paginaAtiva ? '#0DB57A' : '#EAE8E1' }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: form.paginaAtiva ? '22px' : '2px' }} />
                </button>
              </div>
              <p className="text-xs text-[#8C8880]">
                Desativando, o link <strong>/agendar/{slug}</strong> mostra uma mensagem de indisponível e ninguém consegue agendar.
                Você pode reativar quando quiser — nada é apagado.
              </p>
            </div>
          </GlowCard>
        </div>
      )}

      {tab === 'qrcode' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <GlowCard>
            <div className="p-5 flex flex-col items-center">
              <p className="text-xs font-bold tracking-[2px] uppercase text-[#8C8880] mb-3 self-start" style={{ fontFamily: 'Barlow, sans-serif' }}>QR Code</p>
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-lg border border-[#EAE8E1]" />}
              <div className="flex gap-2 mt-4 w-full">
                <button onClick={baixarQr} className="flex-1 h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold text-white" style={{ background: '#1A56FF' }}>
                  <Download className="size-3.5" /> Baixar
                </button>
                <button onClick={compartilharLink} className="flex-1 h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold border border-[#EAE8E1] text-[#1C1B18]">
                  Compartilhar
                </button>
              </div>
            </div>
          </GlowCard>

          <div className="space-y-5">
            <GlowCard>
              <div className="p-5 space-y-3">
                <p className="text-xs font-bold text-[#2E2D29]">Link da página</p>
                <p className="text-xs text-[#8C8880] truncate bg-[#F7F6F3] rounded-lg px-3 py-2">{link}</p>
                <p className="text-xs font-bold text-[#2E2D29] pt-2">Cores do QR Code</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#8C8880]">QR Code</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={form.qrCorFrente} onChange={e => set('qrCorFrente', e.target.value)} className="w-9 h-9 rounded-lg border border-[#EAE8E1] cursor-pointer" />
                      <input value={form.qrCorFrente} onChange={e => set('qrCorFrente', e.target.value)} className="flex-1 h-9 px-2 rounded-lg border border-[#EAE8E1] text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C8880]">Fundo</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={form.qrCorFundo} onChange={e => set('qrCorFundo', e.target.value)} className="w-9 h-9 rounded-lg border border-[#EAE8E1] cursor-pointer" />
                      <input value={form.qrCorFundo} onChange={e => set('qrCorFundo', e.target.value)} className="flex-1 h-9 px-2 rounded-lg border border-[#EAE8E1] text-xs" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap pt-1">
                  {QR_PALETAS.map((p, i) => (
                    <button key={i} onClick={() => { set('qrCorFrente', p.dark); set('qrCorFundo', p.light) }}
                      className="flex rounded-lg overflow-hidden border border-[#EAE8E1]">
                      <span className="w-6 h-6" style={{ background: p.dark }} />
                      <span className="w-6 h-6" style={{ background: p.light }} />
                    </button>
                  ))}
                </div>
              </div>
            </GlowCard>

            <GlowCard>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="size-4 text-[#0DB57A]" />
                    <p className="text-sm font-bold text-[#1C1B18]">Desconto para primeira visita</p>
                  </div>
                  <button onClick={() => set('descontoAtivo', !form.descontoAtivo)}
                    className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                    style={{ background: form.descontoAtivo ? '#0DB57A' : '#EAE8E1' }}>
                    <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: form.descontoAtivo ? '22px' : '2px' }} />
                  </button>
                </div>
                <p className="text-xs text-[#8C8880]">Atrai novos clientes a agendar pelo QR Code ou link.</p>
                {form.descontoAtivo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-[#8C8880]">Tipo</label>
                      <select value={form.descontoTipo} onChange={e => set('descontoTipo', e.target.value as 'percentual' | 'fixo')}
                        className="w-full h-9 px-2 mt-1 rounded-lg border border-[#EAE8E1] text-xs">
                        <option value="percentual">Percentual (%)</option>
                        <option value="fixo">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8C8880]">Valor</label>
                      <input type="number" value={form.descontoValor} onChange={e => set('descontoValor', Number(e.target.value))}
                        className="w-full h-9 px-2 mt-1 rounded-lg border border-[#EAE8E1] text-xs" />
                    </div>
                  </div>
                )}
              </div>
            </GlowCard>
          </div>
        </div>
      )}

      {tab !== 'ordem' && (
        <button onClick={handleSave} disabled={saving}
          className="w-full sm:w-auto h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#1A56FF,#1445DD)', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <><Check className="size-4" /> Salvo!</> : <><Save className="size-4" /> Salvar alterações</>}
        </button>
      )}
    </div>
  )
}
