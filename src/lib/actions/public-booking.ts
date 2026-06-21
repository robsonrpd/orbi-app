'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { SITE_DEFAULT, type SiteConfig } from './site-types'

const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

type ScheduleDay = { open: string; close: string; active: boolean }
type Schedule = Record<string, ScheduleDay>

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Dados públicos da empresa para a página de agendamento (sem auth). */
export async function getBookingInfo(slug: string) {
  const service = createServiceClient()
  const { data: company } = await service
    .from('companies')
    .select('id, name, business_type, settings, logo_url')
    .eq('slug', slug)
    .single()

  if (!company) return { error: 'Empresa não encontrada.' as const }

  const settingsRaw = (company.settings ?? {}) as { site?: Partial<SiteConfig> }
  const siteCheck: SiteConfig = { ...SITE_DEFAULT, ...(settingsRaw.site ?? {}) }
  if (!siteCheck.paginaAtiva) return { error: 'Página desativada.' as const, desativada: true as const }

  const [{ data: services }, { data: reviews }] = await Promise.all([
    service.from('services')
      .select('id, name, price, duration_minutes, image_url')
      .eq('company_id', company.id)
      .eq('active', true)
      .order('name'),
    service.from('reviews' as never)
      .select('rating, author_name, comment, created_at')
      .eq('company_id', company.id)
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .limit(20) as unknown as Promise<{ data: { rating: number; author_name: string | null; comment: string | null; created_at: string }[] | null }>,
  ])

  const settings = (company.settings ?? {}) as { schedule?: Schedule; interval_minutes?: number; site?: Partial<SiteConfig> }
  const list = reviews ?? []
  const mediaAvaliacao = list.length
    ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10
    : null
  const site: SiteConfig = { ...SITE_DEFAULT, ...(settings.site ?? {}) }

  const servicosOrdenados = [...(services ?? [])].sort((a, b) => {
    const ia = site.ordemServicos.indexOf(a.id)
    const ib = site.ordemServicos.indexOf(b.id)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return {
    companyId: company.id,
    companyName: site.titulo || company.name,
    logoUrl: company.logo_url,
    services: servicosOrdenados,
    schedule: settings.schedule ?? {},
    intervalMinutes: settings.interval_minutes ?? 30,
    avaliacoes: list,
    mediaAvaliacao,
    site,
  }
}

/** Horários livres num dia, considerando funcionamento + duração do serviço + agendamentos existentes. */
export async function getAvailableSlots(companyId: string, serviceId: string, dateStr: string) {
  const service = createServiceClient()

  const { data: svc } = await service
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('company_id', companyId)
    .single()
  if (!svc) return { error: 'Serviço inválido.' as const }

  const { data: company } = await service
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single()
  const settings = (company?.settings ?? {}) as { schedule?: Schedule; interval_minutes?: number }
  const schedule = settings.schedule ?? {}
  const interval = settings.interval_minutes ?? 30

  const date = new Date(`${dateStr}T12:00:00`)
  if (isNaN(date.getTime())) return { error: 'Data inválida.' as const }

  const dayKey = DAY_KEYS[date.getDay()]
  const day = schedule[dayKey]
  if (!day || !day.active) return { slots: [] as string[] }

  const openMin = toMinutes(day.open)
  const closeMin = toMinutes(day.close)
  const duration = svc.duration_minutes

  // Agendamentos já existentes nesse dia (não cancelados)
  const dayStart = new Date(`${dateStr}T00:00:00`).toISOString()
  const dayEnd = new Date(`${dateStr}T23:59:59`).toISOString()
  const { data: existing } = await service
    .from('appointments')
    .select('start_at, end_at')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)

  const busy = (existing ?? []).map(a => ({
    start: new Date(a.start_at).getTime(),
    end: new Date(a.end_at).getTime(),
  }))

  const now = Date.now()
  const slots: string[] = []
  for (let t = openMin; t + duration <= closeMin; t += interval) {
    const h = String(Math.floor(t / 60)).padStart(2, '0')
    const m = String(t % 60).padStart(2, '0')
    const slotStart = new Date(`${dateStr}T${h}:${m}:00`).getTime()
    const slotEnd = slotStart + duration * 60 * 1000

    if (slotStart < now) continue
    const conflita = busy.some(b => slotStart < b.end && slotEnd > b.start)
    if (!conflita) slots.push(`${h}:${m}`)
  }

  return { slots }
}

/** Cria o agendamento a partir da página pública (sem login). */
export async function createPublicAppointment(input: {
  slug: string
  serviceId: string
  date: string
  time: string
  name: string
  phone: string
}) {
  const phone = input.phone.replace(/\D/g, '')
  if (!phone || phone.length < 10) return { error: 'WhatsApp inválido.' as const }
  if (!input.name?.trim()) return { error: 'Informe seu nome.' as const }

  const service = createServiceClient()
  const { data: company } = await service
    .from('companies')
    .select('id')
    .eq('slug', input.slug)
    .single()
  if (!company) return { error: 'Empresa não encontrada.' as const }

  const { data: svc } = await service
    .from('services')
    .select('id, duration_minutes, price')
    .eq('id', input.serviceId)
    .eq('company_id', company.id)
    .single()
  if (!svc) return { error: 'Serviço inválido.' as const }

  const startAt = new Date(`${input.date}T${input.time}:00`)
  if (isNaN(startAt.getTime())) return { error: 'Data/hora inválida.' as const }
  if (startAt.getTime() < Date.now()) return { error: 'Esse horário já passou.' as const }
  const endAt = new Date(startAt.getTime() + svc.duration_minutes * 60 * 1000)

  // Revalida que o horário ainda está livre (evita corrida entre 2 clientes)
  const { data: conflito } = await service
    .from('appointments')
    .select('id')
    .eq('company_id', company.id)
    .neq('status', 'cancelled')
    .lt('start_at', endAt.toISOString())
    .gt('end_at', startAt.toISOString())
    .limit(1)
  if (conflito && conflito.length > 0) return { error: 'Esse horário acabou de ser reservado. Escolha outro.' as const }

  // Encontra ou cria o contato pelo telefone
  const { data: existingContact } = await service
    .from('contacts')
    .select('id')
    .eq('company_id', company.id)
    .eq('phone', phone)
    .maybeSingle()

  const primeiraVisita = !existingContact
  let contactId = existingContact?.id
  if (!contactId) {
    const { data: newContact, error: contactError } = await service
      .from('contacts')
      .insert({ company_id: company.id, name: input.name.trim(), phone })
      .select('id')
      .single()
    if (contactError || !newContact) return { error: 'Erro ao registrar seus dados.' as const }
    contactId = newContact.id
  }

  // Desconto de primeira visita (apenas informativo — cobrança é feita no balcão)
  const { data: companyFull } = await service.from('companies').select('settings').eq('id', company.id).single()
  const site: SiteConfig = { ...SITE_DEFAULT, ...((companyFull?.settings as { site?: Partial<SiteConfig> } | null)?.site ?? {}) }
  let desconto: { percentual: number; valorFinal: number } | null = null
  if (primeiraVisita && site.descontoAtivo) {
    const off = site.descontoTipo === 'percentual'
      ? svc.price * (site.descontoValor / 100)
      : site.descontoValor
    const valorFinal = Math.max(0, svc.price - off)
    const percentual = site.descontoTipo === 'percentual' ? site.descontoValor : Math.round((off / svc.price) * 100)
    desconto = { percentual, valorFinal }
  }

  const { error } = await service.from('appointments').insert({
    company_id: company.id,
    contact_id: contactId,
    service_id: svc.id,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: 'scheduled',
    notes: 'Agendado pelo cliente (link público)',
  })
  if (error) return { error: 'Erro ao criar agendamento.' as const }

  return { success: true as const, desconto }
}
