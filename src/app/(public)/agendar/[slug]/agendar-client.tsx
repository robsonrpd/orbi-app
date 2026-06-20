'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAvailableSlots, createPublicAppointment } from '@/lib/actions/public-booking'
import { Loader2, CheckCircle2, Clock, ArrowLeft, Calendar, Scissors, User, Star } from 'lucide-react'

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
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    days.push(d)
  }
  return days
}

const DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIA_SEMANA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function estaAbertoAgora(schedule: Schedule) {
  const now = new Date()
  const dia = schedule[DAY_KEYS[now.getDay()]]
  if (!dia || !dia.active) return false
  const atual = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = dia.open.split(':').map(Number)
  const [ch, cm] = dia.close.split(':').map(Number)
  return atual >= oh * 60 + om && atual <= ch * 60 + cm
}

export function AgendarClient({ slug, companyId, companyName, logoUrl, services, schedule, avaliacoes, mediaAvaliacao }: {
  slug: string
  companyId: string
  companyName: string
  logoUrl: string | null
  services: Service[]
  schedule: Schedule
  avaliacoes: Review[]
  mediaAvaliacao: number | null
}) {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #0A0F1E 0%, #0D1635 60%, #1A2B5E 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-3xl font-black text-white" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
            Orbi<span style={{ color: '#1A56FF' }}>.</span>
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
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
            <div className="p-7">
              {/* Header */}
              <div className="text-center mb-5">
                {logoUrl && (
                  <img src={logoUrl} alt={companyName} className="w-14 h-14 rounded-2xl object-cover mx-auto mb-2 border border-[#EAE8E1]" />
                )}
                <h1 className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                  {companyName}
                </h1>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: aberto ? '#E6F9F3' : '#FEF2F2', color: aberto ? '#0DB57A' : '#EF4444' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: aberto ? '#0DB57A' : '#EF4444' }} />
                    {aberto ? 'Aberto agora' : 'Fechado agora'}
                  </span>
                  {mediaAvaliacao !== null ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1C1B18]">
                      <Star className="size-3 fill-amber-400 text-amber-400" /> {mediaAvaliacao} ({avaliacoes.length})
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#C8C5BB]">Sem avaliações</span>
                  )}
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-1.5 mb-6">
                {[1, 2, 3, 4].map(s => (
                  <span key={s} className="h-1.5 rounded-full transition-all"
                    style={{ width: s === step ? '28px' : '10px', background: s <= step ? '#1A56FF' : '#EAE8E1' }} />
                ))}
              </div>

              {/* Passo 1 — serviço */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B18] uppercase tracking-wide mb-2">
                      <Scissors className="size-3.5" /> Escolha o serviço
                    </p>
                    {services.length === 0 && (
                      <p className="text-sm text-[#8C8880] text-center py-6">Nenhum serviço disponível no momento.</p>
                    )}
                    {services.map(s => (
                      <button key={s.id} onClick={() => { setService(s); setStep(2) }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#EAE8E1] hover:border-[#1A56FF] hover:bg-[#EEF2FF] transition-all text-left">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#F7F6F3] flex items-center justify-center shrink-0">
                            <Scissors className="size-5 text-[#C8C5BB]" strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1C1B18] truncate">{s.name}</p>
                          <p className="text-xs text-[#8C8880]">{s.duration_minutes} min</p>
                        </div>
                        <span className="text-sm font-bold text-[#1A56FF] shrink-0">{fmtMoney(s.price)}</span>
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

              {/* Passo 2 — data */}
              {step === 2 && (
                <div>
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-[#8C8880] mb-4 hover:text-[#1A56FF]">
                    <ArrowLeft className="size-3.5" /> Voltar
                  </button>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B18] uppercase tracking-wide mb-3">
                    <Calendar className="size-3.5" /> Escolha o dia
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {days.map(d => {
                      const ativo = date?.toDateString() === d.toDateString()
                      return (
                        <button key={d.toISOString()} onClick={() => { setDate(d); setStep(3) }}
                          className="rounded-xl py-2.5 flex flex-col items-center transition-all"
                          style={{
                            background: ativo ? '#1A56FF' : '#F7F6F3',
                            color: ativo ? '#fff' : '#1C1B18',
                            border: ativo ? '1px solid #1A56FF' : '1px solid #EAE8E1',
                          }}>
                          <span className="text-[10px] font-semibold opacity-70">{DIA_SEMANA[d.getDay()]}</span>
                          <span className="text-base font-black" style={{ fontFamily: 'Fraunces, serif' }}>{d.getDate()}</span>
                          <span className="text-[10px] opacity-70">{MES[d.getMonth()]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Passo 3 — horário */}
              {step === 3 && (
                <div>
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-[#8C8880] mb-4 hover:text-[#1A56FF]">
                    <ArrowLeft className="size-3.5" /> Voltar
                  </button>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B18] uppercase tracking-wide mb-3">
                    <Clock className="size-3.5" /> Escolha o horário
                  </p>
                  {loadingSlots && (
                    <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-[#1A56FF]" /></div>
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

              {/* Passo 4 — dados + confirmação */}
              {step === 4 && (
                <div>
                  <button onClick={() => setStep(3)} className="flex items-center gap-1 text-xs text-[#8C8880] mb-4 hover:text-[#1A56FF]">
                    <ArrowLeft className="size-3.5" /> Voltar
                  </button>

                  <div className="rounded-xl bg-[#F7F6F3] px-4 py-3 mb-4 text-sm">
                    <p className="font-bold text-[#1C1B18]">{service?.name}</p>
                    <p className="text-[#8C8880]">
                      {date && `${date.getDate()}/${date.getMonth() + 1}`} às {time} · {fmtMoney(service?.price ?? 0)}
                    </p>
                  </div>

                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B18] uppercase tracking-wide mb-3">
                    <User className="size-3.5" /> Seus dados
                  </p>

                  {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-3">{error}</div>}

                  <div className="space-y-3">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
                      className="w-full h-12 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp (com DDD)" type="tel"
                      className="w-full h-12 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]" />
                  </div>

                  <button onClick={handleConfirm} disabled={loading || !name || !phone}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white mt-5 transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ fontFamily: 'Barlow, sans-serif', background: 'linear-gradient(135deg,#1A56FF,#1445DD)', boxShadow: '0 4px 16px rgba(26,86,255,0.4)' }}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : 'Confirmar agendamento'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-white/30 mt-4">Powered by Orbi</p>
      </div>
    </div>
  )
}
