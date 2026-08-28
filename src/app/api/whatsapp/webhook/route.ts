import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMediaBase64, buscarFotoPerfil, enviarTexto, buscarNomeGrupo } from '@/lib/evolution'
import { lerFluxo, proximoDoRodizio, cargaDosVendedores } from '@/lib/atendimento'
import { sendEmail } from '@/lib/email'

// dá tempo pro download de mídia terminar antes do timeout padrão da Vercel
// (sem isso, a Evolution API pode reenviar o mesmo webhook e processar a mensagem 2x)
export const maxDuration = 60

// Evolution chama este endpoint a cada mensagem recebida (evento MESSAGES_UPSERT).
export async function POST(req: NextRequest) {
  // valida o token secreto (se configurado) — barra POSTs forjados de terceiros
  const tokenEsperado = process.env.WHATSAPP_WEBHOOK_TOKEN
  if (tokenEsperado && req.nextUrl.searchParams.get('token') !== tokenEsperado) {
    return NextResponse.json({ ok: true }) // responde 200 genérico, sem revelar que existe proteção
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const instance = (body.instance as string) || ''
  const evento = ((body.event as string) || '').toLowerCase().replace(/_/g, '.')
  const raw = body.data
  if (!instance) return NextResponse.json({ ok: true })

  // identifica a empresa pela instância. O nome é "<slug>-<timestamp>" (timestamp sem hífen),
  // então removo o último segmento pra obter o slug. Mantém fallback pro slug exato (legado).
  type Comp = { id: string; name: string; business_type: string | null; slug: string; settings: Record<string, unknown> }
  const service = createServiceClient()
  const sel = 'id, name, business_type, slug, settings'
  const slugCandidato = instance.replace(/-[a-z0-9]+$/i, '')

  let company = (await service.from('companies').select(sel).eq('slug', slugCandidato).maybeSingle()).data as Comp | null
  if (!company) company = (await service.from('companies').select(sel).eq('slug', instance).maybeSingle()).data as Comp | null
  if (!company) return NextResponse.json({ ok: true })

  // conexão mudou → registra estado, limpa QR se abriu, avisa por e-mail se caiu
  if (evento.includes('connection')) {
    const d = raw as { state?: string; statusReason?: number } | null
    const settings = { ...(company.settings as Record<string, unknown>) }
    const estadoAnterior = settings.wa_state as string | undefined
    settings.wa_last_event = `state=${d?.state} reason=${d?.statusReason}`
    settings.wa_state = d?.state

    if (d?.state === 'open') {
      delete settings.wa_qr
      delete settings.wa_disconnect_alert_sent
      // marca a 1ª vez que esse número ficou ativo no Orbi — usado pra limitar envios enquanto "esquenta"
      if (!settings.wa_primeira_conexao) settings.wa_primeira_conexao = new Date().toISOString()
    } else if (d?.state === 'close' && estadoAnterior !== 'close' && !settings.wa_disconnect_alert_sent) {
      settings.wa_disconnect_alert_sent = true
      await avisarDesconexao(service, company)
    }

    await service.from('companies').update({ settings }).eq('id', company.id)
    return NextResponse.json({ ok: true })
  }

  // QR atualizado → guarda o base64 para o painel exibir
  if (evento.includes('qrcode')) {
    const d = raw as { qrcode?: { base64?: string } | string; base64?: string } | null
    const base64 =
      (typeof d?.qrcode === 'object' ? d?.qrcode?.base64 : undefined)
      ?? d?.base64
      ?? (typeof d?.qrcode === 'string' ? d.qrcode : undefined)
      ?? null
    if (base64) {
      const settings = { ...(company.settings as Record<string, unknown>), wa_qr: base64 }
      await service.from('companies').update({ settings }).eq('id', company.id)
    }
    return NextResponse.json({ ok: true })
  }


  // a partir daqui, só mensagens
  if (evento && !evento.includes('messages')) return NextResponse.json({ ok: true })
  const eventos = Array.isArray(raw) ? raw : raw ? [raw] : []
  if (eventos.length === 0) return NextResponse.json({ ok: true })

  // contatos da empresa (id por últimos 8 dígitos do telefone) — captura sem duplicar
  const { data: contatos } = await service.from('contacts').select('id, phone, foto_url').eq('company_id', company.id)
  const idPorChave = new Map<string, string>()
  const semFotoPorChave = new Map<string, string>()
  for (const c of contatos ?? []) {
    const k = (c.phone ?? '').replace(/\D/g, '').slice(-8)
    if (!k) continue
    idPorChave.set(k, c.id)
    if (!c.foto_url) semFotoPorChave.set(k, c.id)
  }

  for (const ev of eventos) {
    const e = ev as { key?: { remoteJid?: string; fromMe?: boolean; id?: string }; message?: Record<string, unknown>; pushName?: string }
    const jid = e.key?.remoteJid ?? ''
    if (!jid) continue
    // grupo entra como UMA conversa: guarda o JID inteiro e não vira lead.
    // Cada participante virando contato entupiria o CRM de gente que não é cliente.
    const grupo = jid.endsWith('@g.us')
    const numero = grupo ? jid : jid.split('@')[0]
    if (!numero) continue
    const chave = grupo ? '' : numero.replace(/\D/g, '').slice(-8)

    // dedup: a Evolution pode reenviar o mesmo webhook (timeout/retry) — sem isso, a mesma
    // mensagem seria salva/processada 2x na conversa, o que é um forte sinal de bot pro WhatsApp.
    // só pula se for MESMO duplicata (23505 = chave única violada); qualquer outro erro
    // (ex: tabela ainda não criada) não pode travar o atendimento — segue processando.
    if (e.key?.id) {
      const { error: dedupErr } = await service.from('whatsapp_mensagens_processadas' as never)
        .insert({ message_id: `${instance}:${e.key.id}` } as never)
      if (dedupErr && (dedupErr as { code?: string }).code === '23505') continue
    }

    // monta o conteúdo: texto, legenda ou rótulo da mídia (foto/áudio/doc/etc.)
    const msg = e.message ?? {}
    const cap = (m: unknown) => (m as { caption?: string })?.caption
    const texto = (msg.conversation as string)
      ?? (msg.extendedTextMessage as { text?: string })?.text
      ?? cap(msg.imageMessage) ?? cap(msg.videoMessage) ?? cap(msg.documentMessage)
      ?? ''
    const docNome = (msg.documentMessage as { fileName?: string })?.fileName
    const midiaTipo = msg.imageMessage ? 'image'
      : msg.videoMessage ? 'video'
      : (msg.audioMessage || msg.pttMessage) ? 'audio'
      : (msg.documentMessage ? 'document' : null)
    const rotulo = midiaTipo === 'image' ? '📷 Imagem'
      : midiaTipo === 'video' ? '🎥 Vídeo'
      : midiaTipo === 'audio' ? '🎤 Áudio'
      : midiaTipo === 'document' ? `📎 ${docNome || 'Documento'}`
      : msg.stickerMessage ? '😀 Figurinha'
      : msg.locationMessage ? '📍 Localização'
      : msg.contactMessage ? '👤 Contato'
      : null
    const conteudo = texto.trim() || rotulo
    if (!conteudo) continue

    // baixa a mídia (se houver) e guarda no Storage → URL pública pra exibir no chat
    let midia: Midia | undefined
    if (midiaTipo) {
      const url = await baixarMidia(service, company.id, instance, ev, msg, midiaTipo, docNome)
      if (url) midia = { tipo: midiaTipo, url, nome: docNome }
    }

    // mensagem enviada PELA LOJA (pelo celular ou pelo Orbi) → registra como saída sem duplicar o eco do Orbi
    if (e.key?.fromMe) {
      await registrarSaida(service, company.id, numero, conteudo, midia, e.key.id)
      continue
    }

    // CAPTURA AUTOMÁTICA: número novo vira lead na 1ª coluna do funil (personalizada ou "Novo Lead")
    let contactId = chave ? idPorChave.get(chave) : undefined
    if (chave && !contactId) {
      const funilColunas = (company.settings as { funil_colunas?: { key: string }[] })?.funil_colunas
      const etapaEntrada = funilColunas && funilColunas.length > 0 ? funilColunas[0].key : 'novo'
      const { data: novo, error: capErr } = await service.from('contacts').insert({
        company_id: company.id, name: e.pushName?.trim() || null, phone: numero,
        origem: 'WhatsApp', funil_etapa: etapaEntrada, active: true, criado_por: 'WhatsApp',
      } as never).select('id').single()
      if (capErr) console.error('[wh capErr]', capErr.message)
      contactId = (novo as { id?: string })?.id
      if (contactId && chave) { idPorChave.set(chave, contactId); semFotoPorChave.set(chave, contactId) }
    }

    // salva/atualiza a conversa (histórico) PRIMEIRO — isso é o que importa de verdade.
    // sem resposta automática, alguém da equipe responde pelo Conversas/CRM
    // em grupo, o texto vai prefixado com quem falou: sem isso a conversa fica ilegível
    const conteudoFinal = grupo && e.pushName?.trim() ? `${e.pushName.trim()}: ${conteudo}` : conteudo
    await salvarConversa(service, company.id, contactId ?? null, numero, conteudoFinal, midia, e.key?.id, grupo)

    // roteiro de boas-vindas: NUNCA em grupo — o bot respondendo num grupo seria um desastre
    if (!grupo) {
      try {
        await processarFluxo(service, company, instance, numero, conteudo, contactId ?? null)
      } catch (err) { console.error('[wh fluxo]', err) }
    }

    // nome do grupo: buscado uma vez só, quando o grupo aparece pela primeira vez
    if (grupo) {
      try { await garantirNomeGrupo(service, company.id, instance, numero) }
      catch (err) { console.error('[wh nomeGrupo]', err) }
    }

    // busca a foto de perfil só na 1ª vez (contato novo ou que ainda não tem foto salva) — best-effort,
    // roda DEPOIS de salvar a mensagem e tem timeout curto (evolution.ts), nunca pode travar o recebimento
    if (chave && semFotoPorChave.has(chave)) {
      semFotoPorChave.delete(chave)
      try {
        const foto = await buscarFotoPerfil(instance, numero)
        if (foto) await service.from('contacts').update({ foto_url: foto } as never).eq('id', contactId ?? idPorChave.get(chave))
      } catch (err) { console.error('[wh fotoPerfil]', err) }
    }
  }

  return NextResponse.json({ ok: true })
}

// Avisa por e-mail (dono da empresa + super-admins) que o WhatsApp caiu, em tempo real.
async function avisarDesconexao(
  service: ReturnType<typeof createServiceClient>,
  company: { id: string; name: string },
) {
  try {
    const { data: admins } = await service.from('users').select('email').eq('company_id', company.id).eq('role', 'admin')
    const destinos = new Set<string>()
    for (const a of admins ?? []) if (a.email) destinos.add(a.email as string)
    for (const e of (process.env.SUPER_ADMIN_EMAILS ?? '').split(',')) {
      const t = e.trim()
      if (t) destinos.add(t)
    }
    if (destinos.size === 0) return

    const url = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    for (const to of destinos) {
      await sendEmail({
        to,
        subject: `⚠️ WhatsApp desconectado — ${company.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#E0383D">WhatsApp desconectado</h2>
            <p>O WhatsApp da empresa <strong>${company.name}</strong> caiu — as mensagens não vão chegar até reconectar.</p>
            <p>Reconecte o quanto antes para não deixar os clientes sem resposta:</p>
            <p><a href="${url}/dashboard/ia" style="background:#1A56FF;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Reconectar WhatsApp</a></p>
            <p style="color:#8C8880;font-size:13px">Vá em Conexão WhatsApp → Conectar e escaneie o QR code.</p>
          </div>`,
      })
    }
  } catch (err) {
    console.error('[wh avisoDesconexao]', err)
  }
}

type Midia = { tipo: string; url: string; nome?: string }
// waId/waFromMe: identificam a mensagem dentro do WhatsApp. Sem eles não dá pra
// apagar no celular do cliente — o WhatsApp precisa saber exatamente qual mensagem é.
type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: Midia; ts?: string; waId?: string; waFromMe?: boolean; apagada?: boolean }

const EXT: Record<string, string> = { image: 'jpg', audio: 'ogg', video: 'mp4', document: 'bin' }

// Baixa a mídia de uma mensagem (do payload base64 ou via endpoint) e guarda no Storage. Retorna a URL pública.
async function baixarMidia(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, instance: string, ev: unknown, msg: Record<string, unknown>,
  tipo: string, nome?: string,
): Promise<string | null> {
  try {
    let b64 = (msg.base64 as string) || ((ev as { base64?: string })?.base64) || null
    const mime = (msg[`${tipo}Message`] as { mimetype?: string })?.mimetype || null
    if (!b64) {
      const r = await getMediaBase64(instance, ev)
      b64 = r.base64
    }
    if (!b64) return null
    const buf = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ''), 'base64')
    const ext = (nome && nome.includes('.')) ? nome.split('.').pop() : EXT[tipo] || 'bin'
    const path = `${companyId}/wa/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await service.storage.from('fotos').upload(path, buf, { contentType: mime || undefined, upsert: false })
    if (error) { console.error('[wh midia]', error.message); return null }
    return service.storage.from('fotos').getPublicUrl(path).data.publicUrl
  } catch (err) { console.error('[wh midia]', err); return null }
}

// Registra uma mensagem de saída (enviada pela loja) sem duplicar o eco do que o Orbi já enviou.
/**
 * Roteiro automático de primeiro atendimento.
 *
 * O ponteiro fluxo_etapa aponta pra PRÓXIMA etapa a enviar. Se a etapa anterior era uma
 * pergunta, a mensagem que acabou de chegar é a resposta dela — e vira anotação no lead.
 * Como o ponteiro só avança, uma etapa nunca é enviada duas vezes.
 */
async function processarFluxo(
  service: ReturnType<typeof createServiceClient>,
  company: { id: string; settings: Record<string, unknown> },
  instance: string, numero: string, textoRecebido: string, contactId: string | null,
) {
  const fluxo = lerFluxo(company.settings)
  if (!fluxo.ativo || fluxo.etapas.length === 0) return

  const { data: conv } = await service.from('conversations')
    .select('id, fluxo_etapa, messages').eq('company_id', company.id).eq('numero', numero).maybeSingle()
  if (!conv) return

  const total = fluxo.etapas.length
  const atual = (conv as { fluxo_etapa: number | null }).fluxo_etapa ?? 0
  if (atual >= total) return // roteiro já concluído com esse lead

  // se a etapa anterior era pergunta, esta mensagem é a resposta
  const anterior = atual > 0 ? fluxo.etapas[atual - 1] : null
  if (anterior?.tipo === 'pergunta' && contactId && textoRecebido.trim()) {
    await service.from('lead_anotacoes').insert({
      company_id: company.id, contact_id: contactId,
      texto: `${anterior.rotulo || 'Resposta'}: ${textoRecebido.trim().slice(0, 400)}`,
    } as never)
  }

  let i = atual
  let enviadas = 0
  // o que o roteiro enviar precisa entrar no histórico daqui: quem olha o Conversas
  // tem que ver a conversa inteira, não só o lado do cliente
  const enviadasMsgs: Msg[] = []

  while (i < total && enviadas < fluxo.maxSeguidas) {
    const etapa = fluxo.etapas[i]
    const env = await enviarTexto(instance, numero, etapa.texto)
    if (!env.ok) break // não avança o ponteiro se falhou: tenta de novo no próximo contato

    const waId = (env.data as { key?: { id?: string } } | null)?.key?.id
    enviadasMsgs.push({
      role: 'human', content: etapa.texto, ts: new Date().toISOString(),
      ...(waId ? { waId, waFromMe: true } : {}),
    })

    enviadas++
    i++
    if (etapa.tipo === 'pergunta') break // espera a resposta do lead
    if (i < total) await new Promise(r => setTimeout(r, 1200)) // ritmo humano entre mensagens
  }

  if (i === atual) return // nada enviado

  // relê as mensagens: entre o início do roteiro e agora, outra mensagem pode ter chegado
  const { data: atualConv } = await service.from('conversations')
    .select('messages').eq('id', (conv as { id: string }).id).single()
  const base = (atualConv?.messages as Msg[] | null) ?? (conv as { messages?: Msg[] }).messages ?? []

  await service.from('conversations').update({
    fluxo_etapa: i,
    messages: [...base, ...enviadasMsgs].slice(-40),
    last_message_at: new Date().toISOString(),
  }).eq('id', (conv as { id: string }).id)

  // roteiro concluído: entrega o lead pro vendedor com menos leads em aberto
  if (i >= total && fluxo.atribuirVendedor && contactId) {
    await atribuirPorRodizio(service, company.id, contactId)
  }
}

/**
 * Guarda o nome do grupo na primeira vez que ele aparece.
 * Best-effort: se a coluna ainda não existir ou a busca falhar, a conversa
 * continua funcionando — só aparece com o código do grupo em vez do nome.
 */
async function garantirNomeGrupo(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, instance: string, jid: string,
) {
  const { data: conv, error } = await service.from('conversations')
    .select('id, grupo_nome').eq('company_id', companyId).eq('numero', jid).maybeSingle()
  if (error || !conv) return
  if ((conv as { grupo_nome?: string | null }).grupo_nome) return // já tem nome

  const nome = await buscarNomeGrupo(instance, jid)
  if (!nome) return
  await service.from('conversations').update({ grupo_nome: nome }).eq('id', (conv as { id: string }).id)
}

/** Entrega o lead ao vendedor ativo com menos leads em aberto. */
async function atribuirPorRodizio(
  service: ReturnType<typeof createServiceClient>, companyId: string, contactId: string,
) {
  const { data: contato } = await service.from('contacts')
    .select('responsavel_id').eq('id', contactId).eq('company_id', companyId).single()
  if ((contato as { responsavel_id?: string } | null)?.responsavel_id) return // já tem dono

  const { data: vendedores } = await service.from('vendedores')
    .select('id, nome').eq('company_id', companyId).eq('active', true)
  if (!vendedores?.length) return

  const carga = await cargaDosVendedores(service, companyId)
  const escolhido = proximoDoRodizio(vendedores as { id: string; nome: string }[], carga)
  if (escolhido) {
    await service.from('contacts').update({ responsavel_id: escolhido.id } as never)
      .eq('id', contactId).eq('company_id', companyId)
  }
}

async function registrarSaida(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, numero: string, conteudo: string, midia?: Midia, waId?: string,
) {
  const { data: conv } = await service.from('conversations')
    .select('id, messages').eq('company_id', companyId).eq('numero', numero).maybeSingle()
  const anteriores = (conv?.messages as Msg[] | undefined) ?? []

  // Dedup do eco: tudo que o Orbi envia (resposta manual ou roteiro automático) já é gravado
  // na hora do envio. Quando o WhatsApp devolve o eco dessa mesma mensagem, ela não pode
  // entrar de novo.
  //
  // A checagem pelo identificador vem primeiro porque é exata. A comparação por texto é o
  // fallback pra mensagens gravadas antes de existir o identificador — e olha as últimas 5,
  // não só a última: o roteiro envia várias seguidas, e os ecos chegam fora de ordem.
  if (waId && anteriores.some(m => m.waId === waId)) return

  const recentes = anteriores.slice(-5)
  const jaTem = recentes.find(m =>
    (m.role === 'human' || m.role === 'assistant') && m.content === conteudo && !m.waId
  )
  if (jaTem) {
    if (waId && conv) {
      const atualizadas = anteriores.map(m => m === jaTem ? { ...m, waId, waFromMe: true } : m)
      await service.from('conversations').update({ messages: atualizadas }).eq('id', (conv as { id: string }).id)
    }
    return
  }
  const novas: Msg[] = [...anteriores, { role: 'human' as const, content: conteudo, ts: new Date().toISOString(), ...(waId ? { waId, waFromMe: true } : {}), ...(midia ? { midia } : {}) }].slice(-40)
  const patch = { messages: novas, last_message_at: new Date().toISOString() }
  if (conv) await service.from('conversations').update(patch).eq('id', (conv as { id: string }).id)
  else await service.from('conversations').insert({ company_id: companyId, contact_id: null, numero, ...patch } as never)
}

async function salvarConversa(
  service: ReturnType<typeof createServiceClient>,
  companyId: string, contactId: string | null, numero: string,
  userMsg: string, midia?: Midia, waId?: string, grupo?: boolean,
) {
  const { data: conv } = await service.from('conversations')
    .select('id, messages').eq('company_id', companyId).eq('numero', numero).maybeSingle()

  const anteriores = (conv?.messages as Msg[] | undefined) ?? []
  const agora = new Date().toISOString()
  const novas: Msg[] = [...anteriores, { role: 'user', content: userMsg, ts: agora, ...(waId ? { waId, waFromMe: false } : {}), ...(midia ? { midia } : {}) }]

  // NUNCA misturar campos opcionais aqui: se um deles não existir no banco, a gravação
  // inteira falha e a mensagem do cliente se perde — sem erro visível pra ninguém.
  // Salvar a mensagem é o que não pode falhar; o resto vai depois, separado.
  const patch: Record<string, unknown> = {
    messages: novas.slice(-40),
    last_message_at: new Date().toISOString(),
    handled_by_ai: false,
  }

  let convId = (conv as { id: string } | null)?.id ?? null
  if (conv) {
    const { error } = await service.from('conversations').update(patch).eq('id', convId!)
    if (error) console.error('[wh convUpd]', error.message)
  } else {
    const { data: nova, error } = await service.from('conversations')
      .insert({ company_id: companyId, contact_id: contactId, numero, ...patch } as never)
      .select('id').single()
    if (error) console.error('[wh convIns]', error.message)
    convId = (nova as { id?: string } | null)?.id ?? null
  }

  // Cliente respondeu: zera a contagem de cobranças e o alerta de lead parado.
  // Gravação separada e best-effort de propósito — se essas colunas ainda não existirem,
  // o follow-up só não zera; a mensagem já está salva de qualquer forma.
  if (convId && !grupo) {
    const { error } = await service.from('conversations').update({
      followup_etapa: 0, followup_ultimo_em: null,
      sla_alertado_em: null, sla_transferido_em: null,
    }).eq('id', convId)
    if (error) console.error('[wh resetAuto]', error.message)
  }
}
