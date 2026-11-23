'use client'

import { Fragment, useState, useEffect, useRef, useCallback } from 'react'
import { SeparadorDia } from '@/components/orbi/separador-dia'
import { ArrowLeft } from 'lucide-react'
import { AvisosPush } from '@/components/orbi/avisos-push'
import { BotaoMidiaPendente, type MidiaBaixada } from '@/components/orbi/botao-midia-pendente'
import { JanelaContato, JanelaEnquete, JanelaEvento, JanelaRespostas, JanelaNovaConversa, JanelaEncaminhar } from '@/components/orbi/anexos-conversa'
import { CartaoAnuncio, type AnuncioMsg } from '@/components/orbi/cartao-anuncio'
import { useSearchParams, useRouter } from 'next/navigation'
import { MenuMensagem, toqueLongo } from '@/components/orbi/menu-mensagem'
import { ExportarConversas } from '@/components/orbi/exportar-conversas'
import { Etiqueta, JanelaEtiquetas } from '@/components/orbi/etiquetas'
import {
  listarConversas, conversasAtualizadas, obterMensagens, obterMensagensAnteriores, temMensagensAnteriores, responderConversa, enviarMidiaConversa, enviarAudioConversa, iniciarConversa, obterFotoContato,
  apagarMensagem, enviarContatoConversa, enviarEnqueteConversa, enviarFigurinhaConversa, linkDoCatalogo,
  reagirMensagem, encaminharMensagens, listarRespostasRapidas, definirEtiquetasConversa,
  type ConversaResumo,
} from '@/lib/actions/conversas'
import {
  Search, Send, Loader2, Bot, MessageCircle, Smile, Plus, Mic, Square,
  FileText, Image as ImageIcon, Camera, Headphones, User, BarChart2, Calendar, Sticker, Book, Zap,
  AlertTriangle, X, Ban, UsersRound, Check, CheckCheck, MessageSquarePlus, Forward, Download, MoreVertical, Tag,
} from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'human'; content: string; midia?: { tipo: string; url: string; nome?: string }; ts?: string; waId?: string; waFromMe?: boolean; apagada?: boolean; midiaExpirada?: boolean; anuncio?: AnuncioMsg; midiaPendente?: { tipo: string }; status?: 'sent' | 'delivered' | 'read'; resposta?: { waId: string; texto: string }; encaminhada?: boolean; reacoes?: { loja?: string; cliente?: string } }

/**
 * Foto do contato com plano B: se a imagem falhar ao carregar (link vencido, arquivo apagado), mostra as
 * iniciais em vez do ícone de imagem quebrada.
 */
function FotoContato({ src, className, children }: { src: string | null; className: string; children: React.ReactNode }) {
  const [erro, setErro] = useState(false)
  if (src && !erro) return <img src={src} alt="" className={`${className} object-cover`} onError={() => setErro(true)} />
  return <>{children}</>
}

/** Tiques como no WhatsApp: ✓ enviada, ✓✓ cinza entregue, ✓✓ azul lida. Sem status conhecido = enviada. */
function Tiques({ status, ts }: { status?: Msg['status']; ts?: string }) {
  // Sem status conhecido: se acabou de ser enviada é "enviada" (o aviso de entrega chega em segundos);
  // se é ANTIGA (de antes dos tiques existirem) não dá pra saber — melhor não mostrar nada do que
  // afirmar "enviada" de uma mensagem que o cliente já leu.
  if (!status && ts && Date.now() - new Date(ts).getTime() > 10 * 60_000) return null
  const lida = status === 'read'
  const Icone = status === 'delivered' || lida ? CheckCheck : Check
  return (
    <Icone className={`inline size-3.5 ml-1 -mb-[3px] ${lida ? 'text-[#53BDEB]' : 'text-[#6B7C65]'}`} strokeWidth={2.2}
      aria-label={lida ? 'Lida' : status === 'delivered' ? 'Entregue' : 'Enviada'} />
  )
}

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🎉', '❤️', '😊', '😢', '😮', '🔥', '✅', '👏', '🙌', '😅', '🤔', '😎', '💪', '📅', '⏰']

type AcaoAnexo = 'documento' | 'midia' | 'camera' | 'audio' | 'contato' | 'enquete' | 'evento' | 'figurinha' | 'catalogo' | 'respostas'
const ANEXO_ITENS: { icon: typeof FileText; label: string; cor: string; acao: AcaoAnexo }[] = [
  { icon: FileText, label: 'Documento', cor: '#7E57C2', acao: 'documento' },
  { icon: ImageIcon, label: 'Fotos e vídeos', cor: '#1A56FF', acao: 'midia' },
  { icon: Camera, label: 'Câmera', cor: '#EC407A', acao: 'camera' },
  { icon: Headphones, label: 'Áudio', cor: '#FF7043', acao: 'audio' },
  { icon: User, label: 'Contato', cor: '#1A56FF', acao: 'contato' },
  { icon: BarChart2, label: 'Enquete', cor: '#F9A825', acao: 'enquete' },
  { icon: Calendar, label: 'Evento', cor: '#EF5350', acao: 'evento' },
  { icon: Sticker, label: 'Nova figurinha', cor: '#0DB57A', acao: 'figurinha' },
  { icon: Book, label: 'Catálogo', cor: '#8D6E63', acao: 'catalogo' },
  { icon: Zap, label: 'Resposta rápida', cor: '#FBC02D', acao: 'respostas' },
]

function achaConversaPorTel(tel: string | null, lista: ConversaResumo[]) {
  if (!tel) return null
  const chave = tel.replace(/\D/g, '').slice(-8)
  if (!chave) return null
  return lista.find(c => (c.numero ?? '').replace(/\D/g, '').slice(-8) === chave)?.id ?? null
}

function iniciais(nome: string) {
  return nome.trim().slice(0, 1).toUpperCase() || '?'
}

function fmtHora(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtData(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString()) return fmtHora(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

async function uploadArquivo(file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  return res.ok ? data.url : null
}

export function ConversasClient({ conversasIniciais, lojaNome }: { conversasIniciais: ConversaResumo[]; lojaNome: string }) {
  const searchParams = useSearchParams()
  const telParam = searchParams.get('tel')
  const nomeParam = searchParams.get('nome')
  const [conversas, setConversas] = useState(conversasIniciais)
  const [selecionada, setSelecionada] = useState<string | null>(
    () => telParam ? achaConversaPorTel(telParam, conversasIniciais) : (conversasIniciais[0]?.id ?? null)
  )
  // No celular não cabe lista + conversa lado a lado: mostra uma de cada vez (no computador as duas aparecem sempre)
  const [tela, setTela] = useState<'lista' | 'conversa'>(telParam ? 'conversa' : 'lista')
  const [naoEncontrada, setNaoEncontrada] = useState(!!telParam && !achaConversaPorTel(telParam, conversasIniciais))
  const [fotoNaoEncontrada, setFotoNaoEncontrada] = useState<string | null>(null)
  const [menuApagar, setMenuApagar] = useState<number | null>(null) // índice da mensagem com o menu aberto
  const [respondendo, setRespondendo] = useState<Msg | null>(null)
  const [encaminhando, setEncaminhando] = useState<Msg | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [respostasRapidas, setRespostasRapidas] = useState<{ id: string; titulo: string; texto: string }[] | null>(null)
  const [idxAtalho, setIdxAtalho] = useState(0)
  const router = useRouter()
  const [apagando, setApagando] = useState(false)
  const [mensagens, setMensagens] = useState<Msg[]>([])
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregandoMsgs, setCarregandoMsgs] = useState(false)
  // mensagens mais antigas que as 40 da conversa ativa (ficam no arquivo e são buscadas sob demanda)
  const [anteriores, setAnteriores] = useState<Msg[]>([])
  const [temAnteriores, setTemAnteriores] = useState(false)
  const [carregandoAnt, setCarregandoAnt] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [anexoOpen, setAnexoOpen] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarPrimeiroContato, setConfirmarPrimeiroContato] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  // Rolagem: a conversa abre no FIM (mensagem mais recente) e fica "grudada" no fim enquanto as fotos carregam e
  // chegam mensagens novas — mas só se a pessoa não subiu pra ler o histórico (senão cada atualização a puxaria de volta).
  const rolagemRef = useRef<HTMLDivElement>(null)
  const grudadoNoFimRef = useRef(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediatypeRef = useRef<'image' | 'document' | 'video'>('image')
  // o mesmo seletor de arquivo serve para anexo comum, áudio gravado no aparelho e figurinha
  const modoArquivoRef = useRef<'normal' | 'audio' | 'figurinha'>('normal')
  const [janela, setJanela] = useState<null | 'contato' | 'enquete' | 'evento' | 'respostas' | 'nova' | 'exportar' | 'exportar-uma' | 'etiquetas'>(null)
  const [menuConversa, setMenuConversa] = useState(false)
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null)
  const campoTextoRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const carregarMensagens = useCallback((id: string) => {
    obterMensagens(id).then(setMensagens)
  }, [])

  async function handleApagar(indice: number, ts: string | undefined, paraTodos: boolean) {
    if (!selecionada) return
    setApagando(true); setErro(null)
    const r = await apagarMensagem(selecionada, { indice, ts, paraTodos })
    setApagando(false); setMenuApagar(null)
    if (r?.error) { setErro(r.error); return }
    carregarMensagens(selecionada)
  }

  useEffect(() => {
    if (!selecionada) return
    setCarregandoMsgs(true)
    obterMensagens(selecionada).then(m => { setMensagens(m); setCarregandoMsgs(false) })
    // conversa nova na tela: zera o que foi carregado da anterior e vê se há mensagens antigas no arquivo
    setAnteriores([]); setTemAnteriores(false)
    let vivo = true
    temMensagensAnteriores(selecionada).then(t => { if (vivo) setTemAnteriores(t) })
    return () => { vivo = false }
  }, [selecionada])

  async function carregarAnteriores() {
    if (!selecionada || carregandoAnt) return
    setCarregandoAnt(true)
    // continua de onde parou: antes da mais antiga já carregada ou, na 1ª vez, antes da mais antiga da conversa ativa
    const marco = anteriores[0]?.ts ?? mensagens[0]?.ts ?? null
    const r = await obterMensagensAnteriores(selecionada, marco, 50)
    setAnteriores(prev => [...r.msgs, ...prev])
    setTemAnteriores(r.temMais)
    setCarregandoAnt(false)
  }

  useEffect(() => {
    if (!naoEncontrada || !telParam) { setFotoNaoEncontrada(null); return }
    obterFotoContato(telParam).then(setFotoNaoEncontrada)
  }, [naoEncontrada, telParam])

  // Atualização automática. Antes: a cada 6 s baixava a lista inteira COM o histórico de todas as
  // conversas (~1,2 MB por vez, ~6 GB por dia numa aba aberta — a cota gratuita do banco é 5 GB por MÊS).
  // Agora: pergunta só "o que mudou desde a última marca?" e, quando nada mudou, a resposta é vazia.
  const marcaRef = useRef<string | null>(null)
  const selecionadaRef = useRef<string | null>(selecionada)
  const ocultoDesdeRef = useRef<number | null>(null)
  useEffect(() => { selecionadaRef.current = selecionada }, [selecionada])
  useEffect(() => {
    // marca d'água = maior atividade (mensagem nova OU leitura/entrega), não só a última mensagem:
    // senão uma leitura nunca passaria da marca e o tique azul só apareceria na recarga de 5 min
    marcaRef.current = conversas.reduce<string | null>((m, c) => {
      const t = c.atividadeEm ?? c.lastMessageAt
      return t && (!m || t > m) ? t : m
    }, null)
  }, [conversas])

  useEffect(() => {
    let ticks = 0
    let ultimoCompleto = Date.now()
    const ordenar = (a: ConversaResumo, b: ConversaResumo) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')

    // voltou pra aba depois de um tempo: o que mudou nesse intervalo pode passar do que a
    // atualização incremental traz (até 100), então a próxima passada recarrega a lista inteira
    const aoMudarVisibilidade = () => {
      if (document.hidden) { ocultoDesdeRef.current = Date.now(); return }
      if (ocultoDesdeRef.current && Date.now() - ocultoDesdeRef.current > 60_000) ultimoCompleto = 0
      ocultoDesdeRef.current = null
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)

    const t = setInterval(async () => {
      if (document.hidden) return // aba em segundo plano não consome nada
      ticks++
      const sel = selecionadaRef.current

      // a cada 5 min (ou ao voltar de uma ausência longa) recarrega tudo: pega nome/foto alterados
      if (Date.now() - ultimoCompleto > 5 * 60_000) {
        ultimoCompleto = Date.now()
        listarConversas().then(setConversas)
        if (sel) carregarMensagens(sel)
        return
      }

      const novas = await conversasAtualizadas(marcaRef.current)
      if (novas.length > 0) {
        setConversas(prev => {
          const mapa = new Map(prev.map(c => [c.id, c]))
          for (const n of novas) mapa.set(n.id, n)
          return [...mapa.values()].sort(ordenar)
        })
        if (sel && novas.some(n => n.id === sel)) carregarMensagens(sel)
      } else if (sel && ticks % 12 === 0) {
        carregarMensagens(sel) // a cada ~2 min: pega mensagem apagada que não mexe na ordem da lista
      }
      // 10 s (e não 6): cada passada é uma execução na Vercel, e o plano Hobby limita a 1 milhão por mês —
      // com várias abas abertas o dia todo, 6 s passaria disso. Dez segundos é imperceptível numa conversa.
    }, 10_000)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', aoMudarVisibilidade) }
  }, [carregarMensagens])

  const irAoFim = useCallback(() => {
    const el = rolagemRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])
  useEffect(() => { grudadoNoFimRef.current = true }, [selecionada])
  useEffect(() => { if (grudadoNoFimRef.current) irAoFim() }, [mensagens, carregandoMsgs, irAoFim])
  // foto/vídeo aumenta a altura DEPOIS de aparecer: sem isto a conversa parava no meio (era o "abre lá em cima")
  // arquivo do histórico baixado sob demanda: troca nas duas listas (ativa e arquivo) sem recarregar
  const aoBaixarMidia = useCallback((waId: string, midia: MidiaBaixada) => {
    const trocar = (l: Msg[]) => l.map(x => x.waId === waId ? { ...x, midia, midiaPendente: undefined } : x)
    setMensagens(trocar); setAnteriores(trocar)
  }, [])
  // campo de mensagem cresce com o texto (até 5 linhas) e volta ao tamanho normal depois de enviar
  useEffect(() => {
    const el = campoTextoRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }, [texto])
  const aoCarregarMidia = useCallback(() => { if (grudadoNoFimRef.current) irAoFim() }, [irAoFim])

  const filtradas = conversas.filter(c => {
    const termo = busca.toLowerCase()
    if (filtroEtiqueta && !(c.contactTags ?? []).includes(filtroEtiqueta)) return false
    return (c.contactName ?? c.numero).toLowerCase().includes(termo) || c.numero.includes(termo)
  })
  const etiquetasEmUso = [...new Set(conversas.flatMap(c => c.contactTags ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const ativa = conversas.find(c => c.id === selecionada) ?? null

  // abrir conversa por número (link ?tel= ou "Nova conversa"): seleciona a existente ou prepara uma nova
  useEffect(() => {
    if (!telParam) return
    const id = achaConversaPorTel(telParam, conversas)
    if (id) { setSelecionada(id); setNaoEncontrada(false) } else { setSelecionada(null); setNaoEncontrada(true) }
    setTela('conversa')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telParam])

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 2500); return () => clearTimeout(t) }, [aviso])
  useEffect(() => { setRespondendo(null); setMenuApagar(null); setMenuConversa(false) }, [selecionada])

  // atalho "/" para respostas rápidas, como no WhatsApp Business
  const atalho = texto.startsWith('/') && !texto.includes('\n') ? texto.slice(1).toLowerCase() : null
  useEffect(() => {
    if (atalho !== null && respostasRapidas === null) listarRespostasRapidas().then(setRespostasRapidas).catch(() => setRespostasRapidas([]))
  }, [atalho, respostasRapidas])
  const opcoesAtalho = atalho === null ? [] : (respostasRapidas ?? []).filter(r => (r.titulo + ' ' + r.texto).toLowerCase().includes(atalho)).slice(0, 8)
  useEffect(() => { setIdxAtalho(0) }, [atalho])

  function nomeAutor(waId: string) {
    const m = [...anteriores, ...mensagens].find(x => x.waId === waId)
    if (!m) return 'Mensagem'
    return m.role === 'user' ? (ativa?.contactName ?? 'Cliente') : 'Você'
  }

  async function reagir(m: Msg, emoji: string) {
    setMenuApagar(null)
    if (!selecionada || !m.waId) return
    const trocar = (l: Msg[]) => l.map(x => x.waId === m.waId ? { ...x, reacoes: { ...(x.reacoes ?? {}), loja: emoji || undefined } } : x)
    setMensagens(trocar); setAnteriores(trocar)
    const r = await reagirMensagem(selecionada, m.waId, emoji)
    if ('error' in r && r.error) setErro(r.error)
  }

  async function copiar(m: Msg) {
    setMenuApagar(null)
    try { await navigator.clipboard.writeText(m.content); setAviso('Mensagem copiada') } catch { setErro('Não foi possível copiar.') }
  }

  async function encaminharPara(ids: string[]) {
    if (!selecionada || !encaminhando) return 'Mensagem não encontrada.'
    const chave = encaminhando.waId ?? encaminhando.ts
    if (!chave) return 'Essa mensagem não pode ser encaminhada.'
    const r = await encaminharMensagens(selecionada, [chave], ids)
    if ('error' in r && r.error) return r.error
    setAviso(`Encaminhada para ${ids.length} conversa${ids.length > 1 ? 's' : ''}`)
    listarConversas().then(setConversas)
    return null
  }

  async function handleEnviar(forcarPrimeiroContato = false) {
    const t = forcarPrimeiroContato ? confirmarPrimeiroContato : texto.trim()
    if (!t) return
    if (!selecionada && !(naoEncontrada && telParam)) return
    setEnviando(true)
    grudadoNoFimRef.current = true // quem envia quer ver a própria mensagem
    if (!forcarPrimeiroContato) setTexto('')

    const citada = respondendo?.waId && selecionada ? respondendo : null
    const opts = { ...(forcarPrimeiroContato ? { confirmarPrimeiroContato: true } : {}), ...(citada ? { respondendoA: citada.waId } : {}) }
    const res = selecionada
      ? await responderConversa(selecionada, t, opts)
      : await iniciarConversa(telParam!, t, opts)

    setEnviando(false)

    if ('avisoPrimeiroContato' in res && res.avisoPrimeiroContato) {
      setConfirmarPrimeiroContato(t)
      return
    }
    setConfirmarPrimeiroContato(null)

    if (!('error' in res)) {
      if (!selecionada && 'conversaId' in res) {
        setNaoEncontrada(false)
        setSelecionada((res as { conversaId: string }).conversaId)
        setMensagens([{ role: 'human', content: t, ts: new Date().toISOString() }])
      } else {
        setMensagens(prev => [...prev, { role: 'human', content: t, ts: new Date().toISOString(), ...(citada?.waId ? { resposta: { waId: citada.waId, texto: citada.content.slice(0, 200) } } : {}) }])
      }
      setRespondendo(null)
      listarConversas().then(setConversas)
    } else {
      setErro(res.error ?? 'Erro ao enviar.')
    }
  }

  function abrirSeletorArquivo(mediatype: 'image' | 'document' | 'video', accept: string, opts?: { camera?: boolean; modo?: 'normal' | 'audio' | 'figurinha' }) {
    mediatypeRef.current = mediatype
    modoArquivoRef.current = opts?.modo ?? 'normal'
    const el = fileInputRef.current
    if (el) {
      el.accept = accept
      // no celular abre a câmera direto; no computador abre o seletor de arquivos
      if (opts?.camera) el.setAttribute('capture', 'environment'); else el.removeAttribute('capture')
      el.click()
    }
    setAnexoOpen(false)
  }

  /** Coloca um texto pronto no campo de mensagem (para revisar antes de enviar). */
  function colocarNoCampo(t: string) {
    setTexto(atual => (atual.trim() ? atual.trimEnd() + '\n' + t : t))
    setTimeout(() => campoTextoRef.current?.focus(), 50)
  }

  async function escolherAnexo(acao: AcaoAnexo) {
    setAnexoOpen(false)
    if (acao === 'documento') return abrirSeletorArquivo('document', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip')
    if (acao === 'midia') return abrirSeletorArquivo('image', 'image/*,video/*')
    if (acao === 'camera') return abrirSeletorArquivo('image', 'image/*', { camera: true })
    if (acao === 'audio') return abrirSeletorArquivo('document', 'audio/*', { modo: 'audio' })
    if (acao === 'figurinha') return abrirSeletorArquivo('image', 'image/png,image/jpeg,image/webp', { modo: 'figurinha' })
    if (acao === 'catalogo') {
      const r = await linkDoCatalogo()
      if ('error' in r && r.error) { setErro(r.error); return }
      if ('link' in r && r.link) colocarNoCampo(`🛍️ Confira nosso catálogo: ${r.link}`)
      return
    }
    setJanela(acao)
  }

  async function enviarContatoJanela(p: { nome: string; telefone: string }) {
    if (!selecionada) return 'Abra uma conversa primeiro.'
    const r = await enviarContatoConversa(selecionada, p)
    if ('error' in r && r.error) return r.error
    grudadoNoFimRef.current = true
    setMensagens(prev => [...prev, { role: 'human', content: 'conteudo' in r && r.conteudo ? r.conteudo : '👤 Contato', ts: new Date().toISOString() }])
    listarConversas().then(setConversas)
    return null
  }

  async function enviarEnqueteJanela(p: { pergunta: string; opcoes: string[]; variasRespostas: boolean }) {
    if (!selecionada) return 'Abra uma conversa primeiro.'
    const r = await enviarEnqueteConversa(selecionada, p)
    if ('error' in r && r.error) return r.error
    grudadoNoFimRef.current = true
    setMensagens(prev => [...prev, { role: 'human', content: 'conteudo' in r && r.conteudo ? r.conteudo : '📊 Enquete', ts: new Date().toISOString() }])
    listarConversas().then(setConversas)
    return null
  }

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selecionada) return
    setEnviando(true)
    const url = await uploadArquivo(file)
    if (!url) { setEnviando(false); setErro('Falha ao enviar o arquivo.'); return }
    grudadoNoFimRef.current = true
    if (modoArquivoRef.current === 'audio') {
      const ra = await enviarAudioConversa(selecionada, url)
      setEnviando(false)
      if ('error' in ra) { setErro(ra.error ?? 'Erro ao enviar.'); return }
      setMensagens(prev => [...prev, { role: 'human', content: '🎤 Áudio', ts: new Date().toISOString(), midia: { tipo: 'audio', url } }])
      listarConversas().then(setConversas)
      return
    }
    if (modoArquivoRef.current === 'figurinha') {
      const rf = await enviarFigurinhaConversa(selecionada, url)
      setEnviando(false)
      if ('error' in rf) { setErro(rf.error ?? 'Erro ao enviar.'); return }
      setMensagens(prev => [...prev, { role: 'human', content: '😀 Figurinha', ts: new Date().toISOString(), midia: { tipo: 'image', url } }])
      listarConversas().then(setConversas)
      return
    }
    const tipo = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : mediatypeRef.current
    const res = await enviarMidiaConversa(selecionada, { url, mediatype: tipo, fileName: file.name })
    setEnviando(false)
    if (!('error' in res)) {
      setMensagens(prev => [...prev, { role: 'human', content: file.name, ts: new Date().toISOString(), midia: { tipo, url, nome: file.name } }])
      listarConversas().then(setConversas)
    } else {
      setErro(res.error ?? 'Erro ao enviar.')
    }
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data)
      recorder.start()
      mediaRecorderRef.current = recorder
      setGravando(true)
    } catch {
      setErro('Não foi possível acessar o microfone.')
    }
  }

  async function pararEEnviarAudio() {
    const recorder = mediaRecorderRef.current
    if (!recorder || !selecionada) return
    setGravando(false)
    const blob: Blob = await new Promise(resolve => {
      recorder.onstop = () => resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
      recorder.stop()
      recorder.stream.getTracks().forEach(t => t.stop())
    })
    setEnviando(true)
    const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
    const url = await uploadArquivo(file)
    if (!url) { setEnviando(false); setErro('Falha ao enviar o áudio.'); return }
    const res = await enviarAudioConversa(selecionada, url)
    setEnviando(false)
    if (!('error' in res)) {
      setMensagens(prev => [...prev, { role: 'human', content: '🎤 Áudio', ts: new Date().toISOString(), midia: { tipo: 'audio', url } }])
      listarConversas().then(setConversas)
    } else {
      setErro(res.error ?? 'Erro ao enviar.')
    }
  }

  return (
    <div className="flex h-full rounded-xl md:rounded-2xl border border-[#EAE8E1] overflow-hidden bg-white">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleArquivoSelecionado} />

      {/* Lista de conversas */}
      <div className={`w-full md:w-[320px] md:shrink-0 border-r border-[#EAE8E1] flex-col bg-[#F7F6F3] ${tela === 'lista' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-3 border-b border-[#EAE8E1]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
            <button onClick={() => setJanela('nova')} title="Nova conversa" aria-label="Nova conversa"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#1A56FF] hover:bg-[#EEF2FF]"><MessageSquarePlus className="size-4" /></button>
            <button onClick={() => setJanela('exportar')} title="Exportar conversas" aria-label="Exportar conversas"
              className="absolute right-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3] hover:text-[#1A56FF]"><Download className="size-4" /></button>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conversa..."
              className="w-full h-9 pl-8 pr-16 text-sm rounded-lg border border-[#EAE8E1] bg-white outline-none focus:border-[#1A56FF] transition-all" />
          </div>
        </div>
        <AvisosPush compacto />
        {etiquetasEmUso.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-[#EAE8E1] shrink-0 [scrollbar-width:none]">
            <button onClick={() => setFiltroEtiqueta(null)}
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${filtroEtiqueta === null ? 'bg-[#1C1B18] text-white' : 'bg-white border border-[#EAE8E1] text-[#5C5A54]'}`}>Todas</button>
            {etiquetasEmUso.map(e => <Etiqueta key={e} nome={e} ativa={filtroEtiqueta === e} onClick={() => setFiltroEtiqueta(f => f === e ? null : e)} />)}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {filtradas.length === 0 && (
            <p className="text-sm text-[#8C8880] text-center py-10 px-4">Nenhuma conversa ainda. Quando um cliente mandar mensagem no WhatsApp, ela aparece aqui.</p>
          )}
          {filtradas.map(c => {
            const nome = c.contactName ?? c.numero
            const ativo = c.id === selecionada
            return (
              <button key={c.id} onClick={() => { setSelecionada(c.id); setTela('conversa') }}
                className={`w-full flex items-start gap-2.5 px-3 py-3 border-b border-[#EAE8E1] text-left transition-colors ${ativo ? 'bg-white' : 'hover:bg-white/60'}`}>
                <FotoContato key={c.contactFoto ?? 'sem'} src={c.contactFoto} className="w-10 h-10 rounded-full shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: c.grupo ? '#8B5CF6' : '#1A56FF' }}>
                    {c.grupo ? <UsersRound className="size-5" strokeWidth={1.5} /> : iniciais(nome)}
                  </div>
                </FotoContato>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#1C1B18] truncate">{nome}</p>
                    <span className="text-[10px] text-[#8C8880] shrink-0">{fmtData(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-[#8C8880] truncate mt-0.5">{c.ultimaMensagem || 'Sem mensagens'}</p>
                  {(c.contactTags ?? []).length > 0 && (
                    <div className="flex gap-1 mt-1 overflow-hidden">{c.contactTags.slice(0, 3).map(e => <Etiqueta key={e} nome={e} pequena />)}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 min-w-0 flex-col relative ${tela === 'conversa' ? 'flex' : 'hidden md:flex'}`} style={{ background: '#EDEDED' }}>
        {!ativa && naoEncontrada && telParam ? (
          <>
            <div className="h-14 bg-white border-b border-[#EAE8E1] flex items-center gap-2.5 px-4 shrink-0">
              <button onClick={() => setTela('lista')} aria-label="Voltar para as conversas"
                className="md:hidden -ml-2 w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[#5C5A54] hover:bg-[#F7F6F3]"><ArrowLeft className="size-5" /></button>
              {fotoNaoEncontrada ? (
                <img src={fotoNaoEncontrada} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#1A56FF' }}>
                  {iniciais(nomeParam ?? telParam)}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-[#1C1B18]">{nomeParam ?? 'Nova conversa'}</p>
                <p className="text-xs text-[#8C8880]">{telParam}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center text-[#8C8880] text-sm">
              <div className="text-center max-w-xs px-4">
                <MessageCircle className="size-10 mx-auto mb-2 text-[#C8C5BB]" strokeWidth={1.5} />
                Nenhuma conversa com esse cliente ainda. Envie a primeira mensagem abaixo pra começar.
              </div>
            </div>
            {erro && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-1.5 shadow"
                onClick={() => setErro(null)}>
                {erro}
              </div>
            )}
            <div className="p-3 bg-white border-t border-[#EAE8E1] flex items-center gap-1.5 shrink-0">
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() } }}
                placeholder="Digite a primeira mensagem..."
                className="flex-1 h-10 px-4 rounded-full border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all" />
              <button onClick={() => handleEnviar()} disabled={enviando || !texto.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all"
                style={{ background: '#1A56FF' }}>
                {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </>
        ) : !ativa ? (
          <div className="flex-1 flex items-center justify-center text-[#8C8880] text-sm">
            <div className="text-center max-w-xs px-4">
              <MessageCircle className="size-10 mx-auto mb-2 text-[#C8C5BB]" strokeWidth={1.5} />
              Selecione uma conversa
            </div>
          </div>
        ) : (
          <>
            <div className="h-14 bg-white border-b border-[#EAE8E1] flex items-center gap-2.5 px-3 md:px-4 shrink-0">
              <button onClick={() => setTela('lista')} aria-label="Voltar para as conversas"
                className="md:hidden -ml-2 w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[#5C5A54] hover:bg-[#F7F6F3]"><ArrowLeft className="size-5" /></button>
              <FotoContato key={ativa.contactFoto ?? 'sem'} src={ativa.contactFoto} className="w-9 h-9 rounded-full">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: ativa.grupo ? '#8B5CF6' : '#1A56FF' }}>
                  {ativa.grupo ? <UsersRound className="size-4.5" strokeWidth={1.5} /> : iniciais(ativa.contactName ?? ativa.numero)}
                </div>
              </FotoContato>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1C1B18] flex items-center gap-1.5 truncate">
                  {ativa.contactName ?? ativa.numero}
                  {ativa.grupo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F5F3FF] text-[#8B5CF6]">GRUPO</span>}
                </p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-xs text-[#8C8880] shrink-0">{ativa.grupo ? 'Conversa de grupo' : ativa.numero}</p>
                  <div className="hidden sm:flex gap-1 overflow-hidden">{(ativa.contactTags ?? []).map(e => <Etiqueta key={e} nome={e} pequena />)}</div>
                </div>
              </div>
              {!ativa.grupo && (
                <button onClick={() => setJanela('etiquetas')} title="Etiquetas" aria-label="Etiquetas"
                  className="hidden md:flex w-9 h-9 rounded-lg items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3] hover:text-[#1A56FF] shrink-0"><Tag className="size-4.5" /></button>
              )}
              <div className="relative shrink-0">
                <button onClick={() => setMenuConversa(o => !o)} aria-label="Mais opções"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5C5A54] hover:bg-[#F7F6F3]"><MoreVertical className="size-5" /></button>
                {menuConversa && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuConversa(false)} />
                    <div className="absolute right-0 top-full mt-1 z-40 w-56 bg-white rounded-xl shadow-xl border border-[#EAE8E1] py-1.5">
                      {!ativa.grupo && (
                        <button onClick={() => { setMenuConversa(false); setJanela('etiquetas') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2E2D29] hover:bg-[#F7F6F3]">
                          <Tag className="size-4 text-[#8C8880]" /> Etiquetas
                        </button>
                      )}
                      <button onClick={() => { setMenuConversa(false); setJanela('exportar-uma') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2E2D29] hover:bg-[#F7F6F3]">
                        <Download className="size-4 text-[#8C8880]" /> Exportar conversa
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div ref={rolagemRef} className="flex-1 min-h-0 overflow-y-auto p-2.5 md:p-4 space-y-2"
              onScroll={e => { const el = e.currentTarget; grudadoNoFimRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150 }}>
              {!carregandoMsgs && (temAnteriores || anteriores.length > 0) && (
                <div className="flex justify-center pb-1">
                  {temAnteriores ? (
                    <button onClick={carregarAnteriores} disabled={carregandoAnt}
                      className="text-xs font-semibold text-[#1A56FF] bg-white border border-[#EAE8E1] rounded-full px-4 py-1.5 hover:bg-[#F7F6F3] disabled:opacity-60 flex items-center gap-1.5">
                      {carregandoAnt ? <Loader2 className="size-3 animate-spin" /> : null} Ver mensagens anteriores
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#8C8880]">Início da conversa</span>
                  )}
                </div>
              )}
              {/* mensagens do arquivo: só leitura (não dá pra apagar), e sem repetir as que já estão na conversa ativa */}
              {!carregandoMsgs && anteriores
                .filter(a => !mensagens.some(m => (a.waId && m.waId === a.waId) || (!a.waId && m.ts === a.ts && m.content === a.content)))
                .map((m, i, lista) => {
                  const minha = m.role === 'assistant' || m.role === 'human'
                  return (
                    <Fragment key={'ant' + i}>
                    <SeparadorDia ts={m.ts} anterior={lista[i - 1]?.ts} />
                    <div className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[88%] md:max-w-[75%] min-w-0 rounded-xl px-3.5 py-2 text-sm shadow-sm opacity-95 break-words"
                        style={{ background: m.apagada ? '#F0F0F0' : minha ? '#DCF8C6' : '#FFFFFF' }}>
                        {m.midia?.tipo === 'image' && <img src={m.midia.url} alt="" loading="lazy" decoding="async" className="rounded-lg max-w-full mb-1" />}
                        {m.midia?.tipo === 'audio' && <audio src={m.midia.url} controls className="mb-1" />}
                        {!m.midia && m.midiaPendente && m.waId && selecionada && <BotaoMidiaPendente conversaId={selecionada} waId={m.waId} tipo={m.midiaPendente.tipo} onBaixada={md => aoBaixarMidia(m.waId!, md)} />}
                        {m.anuncio && <CartaoAnuncio anuncio={m.anuncio} />}
                        {m.midiaExpirada && <p className="text-[11px] italic text-[#8C8880] mb-1">📎 Mídia removida (guardamos por 6 meses)</p>}
                        <p className={`whitespace-pre-wrap ${m.apagada ? 'italic text-[#8C8880]' : 'text-[#1C1B18]'}`}>{m.apagada ? 'Mensagem apagada' : m.content}</p>
                        {m.ts && (
                          <span className={`block text-[10px] mt-1 text-right ${minha ? 'text-[#3A6B2E]' : 'text-[#8C8880]'}`}>
                            {fmtHora(m.ts)}
                            {minha && !m.apagada && m.status && <Tiques status={m.status} ts={m.ts} />}
                          </span>
                        )}
                      </div>
                    </div>
                    </Fragment>
                  )
                })}
              {carregandoMsgs && (
                <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-[#1A56FF]" /></div>
              )}
              {!carregandoMsgs && mensagens.map((m, i) => {
                const minha = m.role === 'assistant' || m.role === 'human'
                const podeApagarParaTodos = minha && !!m.waFromMe && !!m.waId && !m.apagada
                const reacoes = [m.reacoes?.cliente, m.reacoes?.loja].filter(Boolean) as string[]
                return (
                  <Fragment key={i}>
                  <SeparadorDia ts={m.ts} anterior={i > 0 ? mensagens[i - 1].ts : anteriores[anteriores.length - 1]?.ts} />
                  <div className={`flex ${minha ? 'justify-end' : 'justify-start'} ${reacoes.length ? 'mb-3' : ''}`}>
                    <div className="group relative max-w-[88%] md:max-w-[75%] min-w-0 select-text"
                      {...(m.apagada ? {} : toqueLongo(() => setMenuApagar(i)))}
                      onContextMenu={m.apagada ? undefined : e => { e.preventDefault(); setMenuApagar(i) }}>
                    <div className="rounded-xl px-3.5 py-2 pr-7 text-sm shadow-sm break-words"
                      style={{ background: m.apagada ? '#F0F0F0' : minha ? (m.role === 'assistant' ? '#D9FDD3' : '#DCF8C6') : '#FFFFFF' }}>
                      {m.role === 'assistant' && !m.apagada && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#0DB57A] mb-0.5">
                          <Bot className="size-3" /> IA
                        </span>
                      )}
                      {m.encaminhada && !m.apagada && <p className="flex items-center gap-1 text-[11px] italic text-[#8C8880] mb-0.5"><Forward className="size-3" /> Encaminhada</p>}
                      {m.resposta && !m.apagada && (
                        <div className="mb-1 rounded-md border-l-4 border-[#1A56FF] bg-black/5 px-2 py-1">
                          <p className="text-[11px] font-bold text-[#1A56FF]">{nomeAutor(m.resposta.waId)}</p>
                          <p className="text-xs text-[#5C5A54] line-clamp-3 whitespace-pre-wrap">{m.resposta.texto}</p>
                        </div>
                      )}
                      {m.apagada ? (
                        <p className="flex items-center gap-1.5 text-[#8C8880] italic">
                          <Ban className="size-3.5 shrink-0" /> Mensagem apagada
                        </p>
                      ) : (
                        <>
                          {m.midia && m.midia.tipo === 'image' && <img src={m.midia.url} alt="" loading="lazy" decoding="async" onLoad={aoCarregarMidia} className="rounded-lg max-w-full mb-1" />}
                          {m.midia && m.midia.tipo === 'video' && <video src={m.midia.url} controls onLoadedMetadata={aoCarregarMidia} className="rounded-lg max-w-full mb-1" />}
                          {m.midia && m.midia.tipo === 'audio' && <audio src={m.midia.url} controls className="mb-1 max-w-full" />}
                          {m.midia && m.midia.tipo === 'document' && (
                            <a href={m.midia.url} target="_blank" rel="noopener noreferrer" className="text-[#1A56FF] underline">📎 {m.midia.nome || 'Documento'}</a>
                          )}
                          {!m.midia && m.midiaPendente && m.waId && selecionada && <BotaoMidiaPendente conversaId={selecionada} waId={m.waId} tipo={m.midiaPendente.tipo} onBaixada={md => aoBaixarMidia(m.waId!, md)} />}
                          {m.anuncio && <CartaoAnuncio anuncio={m.anuncio} />}
                          {m.midiaExpirada && <p className="text-[11px] italic text-[#8C8880] mb-1">📎 Mídia removida (guardamos por 6 meses)</p>}
                          {!(m.midia && m.midia.tipo === 'document' && (m.content === m.midia.nome || m.content === `📎 ${m.midia.nome}`)) && (
                            <p className="text-[#1C1B18] whitespace-pre-wrap">{m.content}</p>
                          )}
                        </>
                      )}
                      {m.ts && (
                        <span className={`block text-[10px] mt-1 text-right ${m.apagada ? 'text-[#C8C5BB]' : minha ? 'text-[#3A6B2E]' : 'text-[#8C8880]'}`}>
                          {fmtHora(m.ts)}
                          {minha && !m.apagada && <Tiques status={m.status} ts={m.ts} />}
                        </span>
                      )}
                    </div>
                    {reacoes.length > 0 && (
                      <span className={`absolute -bottom-3.5 ${minha ? 'right-2' : 'left-2'} bg-white rounded-full shadow border border-[#EAE8E1] px-1.5 text-sm leading-6`}>{reacoes.join('')}</span>
                    )}
                    {!m.apagada && (
                      <MenuMensagem aberto={menuApagar === i} minha={minha} apagando={apagando}
                        podeResponder={!!m.waId} podeReagir={!!m.waId} podeParaTodos={podeApagarParaTodos} minhaReacao={m.reacoes?.loja}
                        onAbrir={() => setMenuApagar(i)} onFechar={() => setMenuApagar(null)}
                        onReagir={e => reagir(m, e)}
                        onResponder={() => { setRespondendo(m); setMenuApagar(null); setTimeout(() => campoTextoRef.current?.focus(), 50) }}
                        onCopiar={() => copiar(m)}
                        onEncaminhar={() => { setEncaminhando(m); setMenuApagar(null) }}
                        onApagar={paraTodos => handleApagar(i, m.ts, paraTodos)} />
                    )}
                    </div>
                  </div>
                  </Fragment>
                )
              })}
              <div ref={fimRef} />
            </div>

            {erro && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-1.5 shadow"
                onClick={() => setErro(null)}>
                {erro}
              </div>
            )}

            {aviso && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#0DB57A] text-white text-xs font-semibold rounded-lg px-3 py-1.5 shadow z-30">{aviso}</div>
            )}

            {emojiOpen && (
              <div className="absolute bottom-16 left-3 bg-white rounded-xl shadow-xl border border-[#EAE8E1] p-3 grid grid-cols-5 gap-1.5 z-20">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setTexto(t => t + e); setEmojiOpen(false) }}
                    className="text-xl hover:bg-[#F7F6F3] rounded-lg p-1.5 transition-colors">{e}</button>
                ))}
              </div>
            )}

            {anexoOpen && (
              <div className="absolute bottom-16 left-3 bg-white rounded-xl shadow-xl border border-[#EAE8E1] py-1.5 w-56 z-20">
                {ANEXO_ITENS.map(item => (
                  <button key={item.label} onClick={() => escolherAnexo(item.acao)}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-[#2E2D29] hover:bg-[#F7F6F3] transition-colors">
                    <item.icon className="size-4.5" style={{ color: item.cor }} strokeWidth={1.5} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {opcoesAtalho.length > 0 && (
              <div className="absolute bottom-16 left-3 right-3 md:right-auto md:w-[420px] bg-white rounded-xl shadow-xl border border-[#EAE8E1] z-20 overflow-hidden">
                <p className="px-3.5 pt-2.5 pb-1 text-[11px] font-bold text-[#8C8880] uppercase tracking-wide">Respostas rápidas</p>
                {opcoesAtalho.map((r, k) => (
                  <button key={r.id} onMouseDown={e => { e.preventDefault(); setTexto(r.texto); campoTextoRef.current?.focus() }}
                    className={`w-full text-left px-3.5 py-2 ${k === idxAtalho ? 'bg-[#F0F4FF]' : 'hover:bg-[#F7F6F3]'}`}>
                    <p className="text-sm font-semibold text-[#1C1B18]">{r.titulo}</p>
                    <p className="text-xs text-[#8C8880] line-clamp-2 whitespace-pre-wrap">{r.texto}</p>
                  </button>
                ))}
              </div>
            )}
            {atalho !== null && respostasRapidas !== null && respostasRapidas.length === 0 && (
              <div className="absolute bottom-16 left-3 bg-white rounded-xl shadow-xl border border-[#EAE8E1] z-20 px-3.5 py-2.5 text-xs text-[#8C8880]">
                Nenhuma resposta rápida. Cadastre em <strong>Funil → Mensagens prontas</strong>.
              </div>
            )}

            {respondendo && (
              <div className="px-3 pt-2 bg-white border-t border-[#EAE8E1] shrink-0">
                <div className="flex items-start gap-2 rounded-lg bg-[#F7F6F3] border-l-4 border-[#1A56FF] px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#1A56FF]">Respondendo a {respondendo.role === 'user' ? (ativa?.contactName ?? 'Cliente') : 'você'}</p>
                    <p className="text-xs text-[#5C5A54] truncate">{respondendo.content}</p>
                  </div>
                  <button onClick={() => setRespondendo(null)} aria-label="Cancelar resposta" className="text-[#8C8880] hover:text-[#1C1B18] shrink-0"><X className="size-4" /></button>
                </div>
              </div>
            )}

            <div className={`p-3 bg-white ${respondendo ? '' : 'border-t border-[#EAE8E1]'} flex items-end gap-1.5 shrink-0`}>
              <button onClick={() => { setAnexoOpen(o => !o); setEmojiOpen(false) }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3] transition-colors shrink-0">
                <Plus className="size-5" />
              </button>
              <button onClick={() => { setEmojiOpen(o => !o); setAnexoOpen(false) }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#8C8880] hover:bg-[#F7F6F3] transition-colors shrink-0">
                <Smile className="size-5" />
              </button>
              <textarea ref={campoTextoRef} value={texto} rows={1}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => {
                  if (opcoesAtalho.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setIdxAtalho(k => (k + 1) % opcoesAtalho.length); return }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setIdxAtalho(k => (k - 1 + opcoesAtalho.length) % opcoesAtalho.length); return }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); setTexto(opcoesAtalho[idxAtalho]?.texto ?? texto); return }
                    if (e.key === 'Escape') { e.preventDefault(); setTexto(''); return }
                  }
                  if (e.key === 'Escape' && respondendo) { setRespondendo(null); return }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
                }}
                placeholder={gravando ? 'Gravando áudio...' : 'Digite uma mensagem...'}
                disabled={gravando}
                className="flex-1 min-h-10 max-h-32 py-2.5 px-4 rounded-[20px] border border-[#EAE8E1] bg-[#F7F6F3] text-sm leading-5 outline-none focus:border-[#1A56FF] transition-all disabled:opacity-60 resize-none" />

              {texto.trim() ? (
                <button onClick={() => handleEnviar()} disabled={enviando}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all"
                  style={{ background: '#1A56FF' }}>
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              ) : (
                <button onClick={gravando ? pararEEnviarAudio : iniciarGravacao} disabled={enviando}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all"
                  style={{ background: gravando ? '#EF4444' : '#1A56FF' }}>
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : gravando ? <Square className="size-4" /> : <Mic className="size-4" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {janela === 'contato' && <JanelaContato onFechar={() => setJanela(null)} onEnviar={enviarContatoJanela} />}
      {janela === 'enquete' && <JanelaEnquete onFechar={() => setJanela(null)} onEnviar={enviarEnqueteJanela} />}
      {janela === 'evento' && <JanelaEvento onFechar={() => setJanela(null)} onPronto={colocarNoCampo} />}
      {janela === 'respostas' && <JanelaRespostas onFechar={() => setJanela(null)} onEscolher={colocarNoCampo} />}
      {janela === 'exportar' && <ExportarConversas loja={lojaNome} onFechar={() => setJanela(null)} />}
      {janela === 'exportar-uma' && ativa && <ExportarConversas loja={lojaNome} conversa={{ id: ativa.id, nome: ativa.contactName ?? ativa.numero }} onFechar={() => setJanela(null)} />}
      {janela === 'etiquetas' && ativa && (
        <JanelaEtiquetas atuais={ativa.contactTags ?? []} nome={ativa.contactName ?? ativa.numero} onFechar={() => setJanela(null)}
          onSalvar={async tags => {
            const r = await definirEtiquetasConversa(ativa.id, tags)
            if ('error' in r && r.error) return r.error
            const novas = 'tags' in r && r.tags ? r.tags : tags
            setConversas(l => l.map(c => c.id === ativa.id ? { ...c, contactTags: novas, contactId: ('contactId' in r && r.contactId) || c.contactId } : c))
            return null
          }} />
      )}
      {janela === 'nova' && <JanelaNovaConversa onFechar={() => setJanela(null)}
        onEscolher={({ numero, nome }) => router.replace(`/dashboard/conversas?tel=${numero}${nome ? `&nome=${encodeURIComponent(nome)}` : ''}`)} />}
      {encaminhando && (
        <JanelaEncaminhar onFechar={() => setEncaminhando(null)} onEnviar={encaminharPara}
          previa={encaminhando.midia ? `${encaminhando.content}` : encaminhando.content}
          conversas={conversas.map(c => ({ id: c.id, nome: c.contactName ?? c.numero, numero: c.numero, foto: c.contactFoto }))} />
      )}

      {confirmarPrimeiroContato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE8E1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[#F59E0B]" />
                <p className="text-sm font-bold text-[#1C1B18]">Primeiro contato</p>
              </div>
              <button onClick={() => setConfirmarPrimeiroContato(null)} className="text-[#8C8880] hover:text-[#1C1B18]"><X className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#2E2D29]">
                Esse cliente <strong>nunca mandou mensagem pra você</strong>. Iniciar a conversa mandando você primeiro é mais arriscado pro seu WhatsApp
                (é o principal motivo de bloqueio de números conectados assim). Confirma que quer enviar mesmo assim?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmarPrimeiroContato(null)} className="flex-1 h-10 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
                <button onClick={() => handleEnviar(true)} disabled={enviando} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#F59E0B' }}>
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : 'Enviar mesmo assim'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
