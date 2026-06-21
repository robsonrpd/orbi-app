'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAvailableSlots, createPublicAppointment } from '@/lib/actions/public-booking'
import { Loader2, CheckCircle2, Clock, ArrowLeft, Calendar, Scissors, Star, Tag, X, MessageCircle, AtSign, MapPin } from 'lucide-react'
import type { SiteConfig } from '@/lib/actions/site-types'

type Service = { id: string; name: string; price: number; duration_minutes: number; image_url: string | null }
type ScheduleDay = { open: string; close: string; active: boolean }
type Schedule = Record<string, ScheduleDay>
type Review = { rating: number; author_name: string | null; comment: string | null; created_at: string }

function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function buildDays() {
  const days = []
  const hoje = new Date()
  for (let i = 0; i < 21; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    days.push(d)
  }
  return days
}

const DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIA_SEMANA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function estaAbertoAgora(schedule: Schedule) {
  const now = new Date()
  const dia = schedule[DAY_KEYS[now.getDay()]]
  if (!dia || !dia.active) return false
  const atual = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = dia.open.split(':').map(Number)
  const [ch, cm] = dia.close.split(':').map(Number)
  return atual >= oh * 60 + om && atual <= ch * 60 + cm
}

const ETAPAS = [
  { icon: Scissors, titulo: 'O que vamos fazer hoje?', subtitulo: 'Escolha o serviço desejado' },
  { icon: Calendar, titulo: 'Qual dia você prefere?', subtitulo: 'Selecione a data ideal para seu atendimento' },
  { icon: Clock, titulo: 'Que horário fica melhor?', subtitulo: 'Escolha um horário disponível' },
  { icon: CheckCircle2, titulo: 'Tudo certo!', subtitulo: 'Revise os detalhes do seu agendamento' },
]

export function AgendarClient({ slug, companyId, companyName, logoUrl, services, schedule, avaliacoes, mediaAvaliacao, site }: {
  slug: string
  companyId: string
  companyName: string
  logoUrl: string | null
  services: Service[]
  schedule: Schedule
  avaliacoes: Review[]
  mediaAvaliacao: number | null
  site: SiteConfig
}) {
  const cor = site.corPrimaria || '#1A56FF'
  const corEscura = site.corSecundaria || '#1445DD'
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [service, setService] = useState<Service | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const days = useMemo(buildDays, [])
  const aberto = useMemo(() => estaAbertoAgora(schedule), [schedule])
  const diasAtivos = DAY_KEYS.map((k, i) => ({ key: k, label: DIA_SEMANA_LONGO[i], ...schedule[k] })).filter(d => d.open)

  const diasPorMes = useMemo(() => {
    const grupos: { mes: string; dias: Date[] }[] = []
    for (const d of days) {
      const label = `${MES[d.getMonth()]} ${d.getFullYear()}`
      let g = grupos.find(g => g.mes === label)
      if (!g) { g = { mes: label, dias: [] }; grupos.push(g) }
      g.dias.push(d)
    }
    return grupos
  }, [days])

  useEffect(() => {
    if (!service || !date) return
    setLoadingSlots(true)
    setTime(null)
    const dateStr = date.toISOString().split('T')[0]
    getAvailableSlots(companyId, service.id, dateStr).then(res => {
      setSlots('slots' in res ? res.slots ?? [] : [])
      setLoadingSlots(false)
    })
  }, [service, date, companyId])

  async function handleConfirm() {
    if (!service || !date || !time) return
    setLoading(true)
    setError(null)
    const result = await createPublicAppointment({
      slug,
      serviceId: service.id,
      date: date.toISOString().split('T')[0],
      time,
      name,
      phone,
    })
    setLoading(false)
    if ('error' in result) { setError(result.error ?? 'Erro ao agendar.'); return }
    setDone(true)
  }

  const etapaAtual = ETAPAS[step - 1]

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3' }}>
      {/* Header da empresa */}
      <div className="px-4 pt-6 pb-5" style={{ background: 'linear-gradient(160deg, #0A0F1E 0%, #0D1635 60%, #1A2B5E 100%)' }}>
        <div className="max-w-md mx-auto text-center">
          <span className="text-2xl font-black text-white" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
            Orbi<span style={{ color: cor }}>.</span>
          </span>
          {logoUrl && (
            <img src={logoUrl} alt={companyName} className="w-14 h-14 rounded-2xl object-cover mx-auto mt-4 border border-white/10" />
          )}
          <h1 className="text-2xl font-black text-white mt-2" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            {companyName}
          </h1>
          {site.subtitulo && <p className="text-sm text-white/50 mt-1">{site.subtitulo}</p>}
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: aberto ? 'rgba(13,181,122,0.15)' : 'rgba(239,68,68,0.15)', color: aberto ? '#0DB57A' : '#EF4444' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: aberto ? '#0DB57A' : '#EF4444' }} />
              {aberto ? 'Aberto agora' : 'Fechado agora'}
            </span>
            {mediaAvaliacao !== null ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white">
                <Star className="size-3 fill-amber-400 text-amber-400" /> {mediaAvaliacao} ({avaliacoes.length})
              </span>
            ) : (
              <span className="text-[11px] text-white/40">Sem avaliações</span>
            )}
          </div>

          {(site.whatsapp || site.instagram || site.endereco) && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {site.whatsapp && (
                <a href={`https://wa.me/55${site.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
                  <MessageCircle className="size-4 text-[#25D366]" />
                </a>
              )}
              {site.instagram && (
                <a href={`https://instagram.com/${site.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
                  <AtSign className="size-4 text-white" />
                </a>
              )}
              {site.endereco && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(site.endereco)}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
                  <MapPin className="size-4 text-white" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-1 pb-10">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {done ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E6F9F3] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="size-8 text-[#0DB57A]" strokeWidth={1.5} />
              </div>
              <h1 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Agendado! 🎉</h1>
              <p className="text-sm text-[#8C8880] mt-2">
                {service?.name} em <strong>{companyName}</strong>{' '}
                no dia <strong>{date && `${date.getDate()}/${date.getMonth() + 1}`}</strong> às <strong>{time}</strong>.
              </p>
              <p className="text-xs text-[#C8C5BB] mt-3">Chegue com alguns minutos de antecedência.</p>
            </div>
          ) : (
            <div className="pt-7 px-6 pb-7">
              {/* Timeline de ícones */}
              <div className="flex items-center justify-center mb-6">
                {ETAPAS.map((e, i) => {
                  const num = i + 1
                  const ativo = num === step
                  const feito = num < step
                  return (
                    <div key={num} className="flex items-center">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: ativo || feito ? cor : '#F0F2F5',
                          color: ativo || feito ? '#fff' : '#C8C5BB',
                        }}>
                        <e.icon className="size-4" strokeWidth={2} />
                      </div>
                      {num < ETAPAS.length && (
                        <div className="w-8 sm:w-10 h-[2px] mx-1" style={{ background: feito ? cor : '#EAE8E1' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Headline da etapa */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                  {etapaAtual.titulo}
                </h2>
                <p className="text-sm text-[#8C8880] mt-1">{etapaAtual.subtitulo}</p>
              </div>

              {step > 1 && (
                <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="flex items-center gap-1 text-xs text-[#8C8880] mb-4 hover:text-[#1A56FF]">
                  <ArrowLeft className="size-3.5" /> Voltar
                </button>
              )}

              {/* Passo 1 — serviço */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    {services.length === 0 && (
                      <p className="text-sm text-[#8C8880] text-center py-6">Nenhum serviço disponível no momento.</p>
                    )}
                    {services.map(s => (
                      <button key={s.id} onClick={() => { setService(s); setStep(2) }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#EAE8E1] hover:border-[#1A56FF] hover:bg-[#EEF2FF] transition-all text-left">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                            <Scissors className="size-5" style={{ color: cor }} strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1C1B18] truncate">{s.name}</p>
                          <p className="flex items-center gap-1 text-xs text-[#8C8880]"><Clock className="size-3" /> {s.duration_minutes} min</p>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: cor }}>{fmtMoney(s.price)}</span>
                      </button>
                    ))}
                  </div>

                  {diasAtivos.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B18] uppercase tracking-wide mb-2">
                        <Clock className="size-3.5" /> Horário de funcionamento
                      </p>
                      <div className="rounded-xl bg-[#F7F6F3] divide-y divide-[#EAE8E1]">
                        {diasAtivos.map(d => (
                          <div key={d.key} className="flex items-center justify-between px-3.5 py-2 text-xs">
                            <span className="text-[#2E2D29]">{d.label}</span>
                            <span className={d.active ? 'text-[#1C1B18] font-semibold' : 'text-[#C8C5BB]'}>
                              {d.active ? `${d.open} – ${d.close}` : 'Fechado'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {avaliacoes.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B18] uppercase tracking-wide mb-2">
                        <Star className="size-3.5" /> Avaliações de clientes
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {avaliacoes.slice(0, 5).map((r, i) => (
                          <div key={i} className="rounded-xl border border-[#EAE8E1] px-3.5 py-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1C1B18]">{r.author_name || 'Cliente'}</span>
                              <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
                                {Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="size-2.5 fill-amber-400" />)}
                              </span>
                            </div>
                            {r.comment && <p className="text-xs text-[#8C8880] mt-1">{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Passo 2 — data, agrupado por mês */}
              {step === 2 && (
                <div className="space-y-5">
                  {diasPorMes.map(grupo => (
                    <div key={grupo.mes}>
                      <p className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider mb-2">{grupo.mes}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {grupo.dias.map(d => {
                          const ativo = date?.toDateString() === d.toDateString()
                          const hoje = d.toDateString() === new Date().toDateString()
                          return (
                            <button key={d.toISOString()} onClick={() => { setDate(d); setStep(3) }}
                              className="rounded-xl py-2.5 flex flex-col items-center transition-all"
                              style={{
                                background: ativo ? cor : '#F7F6F3',
                                color: ativo ? '#fff' : '#1C1B18',
                                border: ativo ? `1px solid ${cor}` : hoje ? `1px solid ${cor}80` : '1px solid #EAE8E1',
                              }}>
                              <span className="text-[10px] font-semibold opacity-70">{hoje ? 'HOJE' : DIA_SEMANA[d.getDay()]}</span>
                              <span className="text-base font-black" style={{ fontFamily: 'Fraunces, serif' }}>{d.getDate()}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Passo 3 — horário */}
              {step === 3 && (
                <div>
                  {loadingSlots && (
                    <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" style={{ color: cor }} /></div>
                  )}
                  {!loadingSlots && slots.length === 0 && (
                    <p className="text-sm text-[#8C8880] text-center py-6">Sem horários livres nesse dia. Escolha outra data.</p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(t => (
                      <button key={t} onClick={() => { setTime(t); setStep(4) }}
                        className="rounded-xl py-2.5 text-sm font-semibold border border-[#EAE8E1] hover:border-[#1A56FF] hover:bg-[#EEF2FF] transition-all">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Passo 4 — resumo + confirmação */}
              {step === 4 && (
                <div>
                  <div className="rounded-2xl bg-[#F7F6F3] divide-y divide-[#EAE8E1] mb-5">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                        <Scissors className="size-4" style={{ color: cor }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider">Serviço</p>
                        <p className="text-sm font-bold text-[#1C1B18]">{service?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                        <Calendar className="size-4" style={{ color: cor }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider">Data</p>
                        <p className="text-sm font-bold text-[#1C1B18]">
                          {date && `${DIA_SEMANA_LONGO[date.getDay()]}, ${date.getDate()} de ${MES[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                        <Clock className="size-4" style={{ color: cor }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider">Horário</p>
                        <p className="text-sm font-bold text-[#1C1B18]">{time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                        <Tag className="size-4" style={{ color: cor }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider">Valor</p>
                        <p className="text-sm font-bold text-[#1C1B18]">{fmtMoney(service?.price ?? 0)}</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-3">
                      {error}
                      <button onClick={() => setError(null)}><X className="size-3.5 shrink-0" /></button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
                      className="w-full h-12 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp (com DDD)" type="tel"
                      className="w-full h-12 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
                  </div>

                  <button onClick={handleConfirm} disabled={loading || !name || !phone}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white mt-5 transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ fontFamily: 'Barlow, sans-serif', background: `linear-gradient(135deg, ${cor}, ${corEscura})`, boxShadow: `0 4px 16px ${cor}66` }}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <><CheckCircle2 className="size-4" /> Confirmar Agendamento</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-[#C8C5BB] mt-4">Powered by Orbi</p>
      </div>
    </div>
  )
}
