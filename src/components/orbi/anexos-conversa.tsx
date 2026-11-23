'use client'

// Janelas dos anexos do Conversas que pedem dados antes de enviar: contato, enquete, evento e respostas rápidas.
import { useEffect, useState } from 'react'
import { Check, Loader2, Plus, Search, Trash2, X } from 'lucide-react'
import { listarRespostasRapidas, buscarContatos } from '@/lib/actions/conversas'

type ContatoAgenda = { nome: string; numero: string; origem: 'agenda' | 'cliente' }

function fmtTel(n: string) {
  const d = n.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : n
}

/** Lista de contatos (agenda do celular da loja + clientes do Orbi) com busca, como a lista de contatos do WhatsApp. */
function ListaContatos({ onEscolher, autoFocus = false }: { onEscolher: (c: ContatoAgenda) => void; autoFocus?: boolean }) {
  const [termo, setTermo] = useState('')
  const [itens, setItens] = useState<ContatoAgenda[] | null>(null)
  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => { buscarContatos(termo).then(r => { if (vivo) setItens(r) }).catch(() => { if (vivo) setItens([]) }) }, termo ? 300 : 0)
    return () => { vivo = false; clearTimeout(t) }
  }, [termo])
  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
        <input autoFocus={autoFocus} value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar nome ou número" className={`${inputCls} pl-8`} />
      </div>
      <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-[#F3F1EB] rounded-lg border border-[#EAE8E1]">
        {itens === null ? (
          <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin text-[#1A56FF]" /></div>
        ) : itens.length === 0 ? (
          <p className="text-xs text-[#8C8880] text-center py-4 px-3">Nenhum contato encontrado. A agenda do celular aparece aqui depois que o WhatsApp sincronizar (ao conectar).</p>
        ) : itens.map(c => (
          <button key={c.numero} onClick={() => onEscolher(c)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F7F6F3]">
            <div className="w-8 h-8 rounded-full bg-[#1A56FF] text-white text-xs font-bold flex items-center justify-center shrink-0">{(c.nome[0] ?? '?').toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1C1B18] truncate">{c.nome}</p>
              <p className="text-[11px] text-[#8C8880]">{fmtTel(c.numero)}{c.origem === 'cliente' ? ' · cliente do Orbi' : ''}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]'
const labelCls = 'text-[11px] font-bold text-[#8C8880] uppercase tracking-wide block mb-1'

function Janela({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4" style={{ background: 'rgba(10,15,30,0.55)' }} onClick={onFechar}>
      <div className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-[#EAE8E1] flex items-center justify-between shrink-0">
          <p className="text-sm font-bold text-[#1C1B18]">{titulo}</p>
          <button onClick={onFechar} aria-label="Fechar" className="text-[#8C8880] hover:text-[#1C1B18]"><X className="size-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">{children}</div>
      </div>
    </div>
  )
}

function BotaoEnviar({ ocupado, desabilitado, onClick, rotulo = 'Enviar' }: { ocupado: boolean; desabilitado?: boolean; onClick: () => void; rotulo?: string }) {
  return (
    <button onClick={onClick} disabled={ocupado || desabilitado}
      className="w-full h-11 rounded-xl bg-[#1A56FF] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
      {ocupado && <Loader2 className="size-4 animate-spin" />} {rotulo}
    </button>
  )
}

export function JanelaContato({ onFechar, onEnviar }: { onFechar: () => void; onEnviar: (p: { nome: string; telefone: string }) => Promise<string | null> }) {
  const [nome, setNome] = useState(''), [telefone, setTelefone] = useState('')
  const [ocupado, setOcupado] = useState(false), [erro, setErro] = useState<string | null>(null)
  async function enviar() {
    setOcupado(true); setErro(null)
    const e = await onEnviar({ nome, telefone })
    setOcupado(false)
    if (e) setErro(e); else onFechar()
  }
  return (
    <Janela titulo="Enviar contato" onFechar={onFechar}>
      <div>
        <label className={labelCls}>Escolher da agenda</label>
        <ListaContatos onEscolher={c => { setNome(c.nome); setTelefone(c.numero) }} />
      </div>
      <div><label className={labelCls}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Ex: Dra. Ana — Oftalmologista" /></div>
      <div><label className={labelCls}>Telefone (com DDD)</label><input value={telefone} onChange={e => setTelefone(e.target.value)} inputMode="tel" className={inputCls} placeholder="(84) 99999-9999" /></div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <BotaoEnviar ocupado={ocupado} desabilitado={!nome.trim() || telefone.replace(/\D/g, '').length < 10} onClick={enviar} />
    </Janela>
  )
}

export function JanelaEnquete({ onFechar, onEnviar }: { onFechar: () => void; onEnviar: (p: { pergunta: string; opcoes: string[]; variasRespostas: boolean }) => Promise<string | null> }) {
  const [pergunta, setPergunta] = useState('')
  const [opcoes, setOpcoes] = useState(['', ''])
  const [varias, setVarias] = useState(false)
  const [ocupado, setOcupado] = useState(false), [erro, setErro] = useState<string | null>(null)
  const validas = opcoes.filter(o => o.trim()).length
  async function enviar() {
    setOcupado(true); setErro(null)
    const e = await onEnviar({ pergunta, opcoes, variasRespostas: varias })
    setOcupado(false)
    if (e) setErro(e); else onFechar()
  }
  return (
    <Janela titulo="Criar enquete" onFechar={onFechar}>
      <div><label className={labelCls}>Pergunta</label><input autoFocus value={pergunta} onChange={e => setPergunta(e.target.value)} className={inputCls} placeholder="Ex: Qual horário fica melhor pra você?" /></div>
      <div>
        <label className={labelCls}>Opções</label>
        <div className="space-y-2">
          {opcoes.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input value={o} onChange={e => setOpcoes(l => l.map((x, j) => j === i ? e.target.value : x))} className={inputCls} placeholder={`Opção ${i + 1}`} />
              {opcoes.length > 2 && (
                <button onClick={() => setOpcoes(l => l.filter((_, j) => j !== i))} aria-label="Remover opção"
                  className="w-10 shrink-0 rounded-lg border border-[#EAE8E1] flex items-center justify-center text-[#8C8880] hover:text-red-500"><Trash2 className="size-4" /></button>
              )}
            </div>
          ))}
        </div>
        {opcoes.length < 12 && (
          <button onClick={() => setOpcoes(l => [...l, ''])} className="mt-2 text-xs font-semibold text-[#1A56FF] flex items-center gap-1"><Plus className="size-3.5" /> Adicionar opção</button>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-[#2E2D29]">
        <input type="checkbox" checked={varias} onChange={e => setVarias(e.target.checked)} className="size-4 accent-[#1A56FF]" /> Permitir mais de uma resposta
      </label>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <BotaoEnviar ocupado={ocupado} desabilitado={!pergunta.trim() || validas < 2} onClick={enviar} />
    </Janela>
  )
}

/** Evento: monta uma mensagem organizada (título, data, hora, local) e coloca no campo de texto para revisar antes de enviar. */
export function JanelaEvento({ onFechar, onPronto }: { onFechar: () => void; onPronto: (texto: string) => void }) {
  const [titulo, setTitulo] = useState(''), [data, setData] = useState(''), [hora, setHora] = useState('')
  const [local, setLocal] = useState(''), [descricao, setDescricao] = useState('')
  function pronto() {
    const quando = data ? new Date(`${data}T${hora || '00:00'}`) : null
    const dia = quando ? quando.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
    const linhas = [
      `📅 *${titulo.trim()}*`,
      dia ? `🗓️ ${dia.charAt(0).toUpperCase() + dia.slice(1)}${hora ? ` às ${hora}` : ''}` : '',
      local.trim() ? `📍 ${local.trim()}` : '',
      descricao.trim() ? `\n${descricao.trim()}` : '',
    ].filter(Boolean)
    onPronto(linhas.join('\n'))
    onFechar()
  }
  return (
    <Janela titulo="Evento" onFechar={onFechar}>
      <div><label className={labelCls}>Nome do evento</label><input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} placeholder="Ex: Exame de vista gratuito" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Data</label><input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Hora</label><input type="time" value={hora} onChange={e => setHora(e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Local</label><input value={local} onChange={e => setLocal(e.target.value)} className={inputCls} placeholder="Endereço ou link" /></div>
      <div><label className={labelCls}>Detalhes (opcional)</label><textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} className={`${inputCls} h-auto py-2 resize-none`} /></div>
      <p className="text-[11px] text-[#8C8880]">A mensagem vai para o campo de texto para você revisar antes de enviar.</p>
      <BotaoEnviar ocupado={false} desabilitado={!titulo.trim()} onClick={pronto} rotulo="Montar mensagem" />
    </Janela>
  )
}

/** Respostas rápidas (as mesmas "Mensagens prontas" do Funil): tocar coloca o texto no campo, para revisar e enviar. */
export function JanelaRespostas({ onFechar, onEscolher }: { onFechar: () => void; onEscolher: (texto: string) => void }) {
  const [itens, setItens] = useState<{ id: string; titulo: string; texto: string }[] | null>(null)
  const [busca, setBusca] = useState('')
  useEffect(() => { listarRespostasRapidas().then(setItens).catch(() => setItens([])) }, [])
  const filtrados = (itens ?? []).filter(i => (i.titulo + ' ' + i.texto).toLowerCase().includes(busca.toLowerCase()))
  return (
    <Janela titulo="Respostas rápidas" onFechar={onFechar}>
      {itens === null ? (
        <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-[#1A56FF]" /></div>
      ) : itens.length === 0 ? (
        <p className="text-sm text-[#8C8880] text-center py-4">Nenhuma resposta rápida ainda. Cadastre em <strong>Funil → Mensagens prontas</strong>.</p>
      ) : (
        <>
          {itens.length > 5 && <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className={inputCls} />}
          <div className="space-y-2">
            {filtrados.map(i => (
              <button key={i.id} onClick={() => { onEscolher(i.texto); onFechar() }}
                className="w-full text-left rounded-xl border border-[#EAE8E1] px-3.5 py-2.5 hover:border-[#1A56FF] hover:bg-[#F7F9FF] transition-colors">
                <p className="text-sm font-semibold text-[#1C1B18]">{i.titulo}</p>
                <p className="text-xs text-[#8C8880] line-clamp-2 whitespace-pre-wrap">{i.texto}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </Janela>
  )
}

/** Nova conversa: escolhe da agenda/clientes ou digita um número. */
export function JanelaNovaConversa({ onFechar, onEscolher }: { onFechar: () => void; onEscolher: (p: { numero: string; nome?: string }) => void }) {
  const [numero, setNumero] = useState('')
  const d = numero.replace(/\D/g, '')
  return (
    <Janela titulo="Nova conversa" onFechar={onFechar}>
      <ListaContatos autoFocus onEscolher={c => { onEscolher({ numero: c.numero, nome: c.nome }); onFechar() }} />
      <div>
        <label className={labelCls}>Ou digite o número (com DDD)</label>
        <div className="flex gap-2">
          <input value={numero} onChange={e => setNumero(e.target.value)} inputMode="tel" placeholder="(84) 99999-9999" className={inputCls} />
          <button disabled={d.length < 10} onClick={() => { onEscolher({ numero: d.length <= 11 ? `55${d}` : d }); onFechar() }}
            className="shrink-0 px-4 rounded-lg bg-[#1A56FF] text-white text-sm font-bold disabled:opacity-50">Abrir</button>
        </div>
      </div>
    </Janela>
  )
}

type ConversaParaEncaminhar = { id: string; nome: string; numero: string; foto?: string | null }

/** Encaminhar: escolhe até 20 conversas e envia a mensagem para todas. */
export function JanelaEncaminhar({ conversas, previa, onFechar, onEnviar }: {
  conversas: ConversaParaEncaminhar[]; previa: string; onFechar: () => void; onEnviar: (ids: string[]) => Promise<string | null>
}) {
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [ocupado, setOcupado] = useState(false), [erro, setErro] = useState<string | null>(null)
  const filtradas = conversas.filter(c => (c.nome + ' ' + c.numero).toLowerCase().includes(busca.toLowerCase())).slice(0, 80)
  const alternar = (id: string) => setSel(l => l.includes(id) ? l.filter(x => x !== id) : l.length >= 20 ? l : [...l, id])
  async function enviar() {
    setOcupado(true); setErro(null)
    const e = await onEnviar(sel)
    setOcupado(false)
    if (e) setErro(e); else onFechar()
  }
  return (
    <Janela titulo="Encaminhar mensagem" onFechar={onFechar}>
      <p className="text-xs text-[#5C5A54] bg-[#F7F6F3] rounded-lg px-3 py-2 line-clamp-3 whitespace-pre-wrap">{previa}</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#C8C5BB]" />
        <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conversa" className={`${inputCls} pl-8`} />
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-[#F3F1EB] rounded-lg border border-[#EAE8E1]">
        {filtradas.map(c => {
          const marcado = sel.includes(c.id)
          return (
            <button key={c.id} onClick={() => alternar(c.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F7F6F3]">
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${marcado ? 'bg-[#1A56FF] border-[#1A56FF]' : 'border-[#C8C5BB]'}`}>{marcado && <Check className="size-3.5 text-white" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#1C1B18] truncate">{c.nome}</span>
                <span className="block text-[11px] text-[#8C8880]">{c.numero.includes('@') ? 'Grupo' : fmtTel(c.numero)}</span>
              </span>
            </button>
          )
        })}
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <BotaoEnviar ocupado={ocupado} desabilitado={sel.length === 0} onClick={enviar} rotulo={sel.length ? `Encaminhar para ${sel.length}` : 'Escolha as conversas'} />
    </Janela>
  )
}
