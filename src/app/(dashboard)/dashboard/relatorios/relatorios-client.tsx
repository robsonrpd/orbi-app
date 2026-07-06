'use client'

import { useState, useMemo } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { salvarMetaMensal } from '@/lib/actions/empresa'
import {
  TrendingUp, DollarSign, Package, Users, Stethoscope,
  ShoppingBag, Eye, Award, BarChart2, Percent, Crown,
  Target, Scale, Loader2, Check, Mail, Tag
} from 'lucide-react'

type Item = { tipo: string; descricao: string; valor: number; qtd: number }
type Tx = { amount: number; status: string; created_at: string; paid_at: string | null; contact_id: string | null; contacts: { name: string | null; phone: string } | null }
type OS = { total: number; medico: string | null; vendedor: string | null; status: string; created_at: string; itens: Item[] }
type Orc = { total: number; vendedor: string | null; status: string; created_at: string; itens: Item[] }
type Prod = { name: string; price: number; cost_price: number; stock: number; tipo_produto: string | null }
type Vend = { nome: string; comissao_percent: number }
type Rec = { data_receita: string; contacts: { name: string | null; phone: string } | null }
type Ct = { id: string; name: string | null; phone: string; email: string | null; origem: string | null; data_nascimento: string | null; created_at: string }
type Cp = { descricao: string; fornecedor: string | null; valor: number; status: string; vencimento: string | null; pago_em: string | null }

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const PERIODS = [
  { key: 'mes', label: 'Este mês' },
  { key: 'mes_passado', label: 'Mês passado' },
  { key: 'ano', label: 'Este ano' },
  { key: 'tudo', label: 'Tudo' },
]
const CATEGORIES = [
  { key: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'dre', label: 'DRE', icon: Scale },
  { key: 'estoque', label: 'Estoque', icon: Package },
  { key: 'clientes', label: 'Clientes', icon: Users },
]

type Props = {
  transactions: Tx[]; ordens: OS[]; orcamentos: Orc[]
  products: Prod[]; vendedores: Vend[]; receitas: Rec[]; contacts: Ct[]
  contasPagar: Cp[]; metaMensal: number
}

export function RelatoriosClient({ transactions, ordens, orcamentos, products, vendedores, receitas, contacts, contasPagar, metaMensal }: Props) {
  const [period, setPeriod] = useState('mes')
  const [cat, setCat] = useState('vendas')
  const [meta, setMeta] = useState(metaMensal)
  const [metaInput, setMetaInput] = useState(metaMensal ? String(metaMensal) : '')
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaSalva, setMetaSalva] = useState(false)

  const { start, end } = useMemo(() => {
    const now = new Date()
    if (period === 'mes') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date() }
    if (period === 'mes_passado') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59) }
    if (period === 'ano') return { start: new Date(now.getFullYear(), 0, 1), end: new Date() }
    return { start: new Date(2000, 0, 1), end: new Date() }
  }, [period])

  const inRange = (d: string) => { const t = new Date(d).getTime(); return t >= start.getTime() && t <= end.getTime() }

  const txP = transactions.filter(t => inRange(t.paid_at ?? t.created_at))
  const osP = ordens.filter(o => inRange(o.created_at))
  const orcP = orcamentos.filter(o => inRange(o.created_at))

  // === VENDAS ===
  const faturamento = txP.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0)
  const numVendas = txP.filter(t => t.status === 'paid').length
  const ticketMedio = numVendas > 0 ? faturamento / numVendas : 0

  // Produtos mais vendidos (agrega itens das O.S.)
  const prodMap = new Map<string, { qtd: number; total: number }>()
  osP.forEach(o => o.itens?.forEach(i => {
    if (i.tipo !== 'produto') return
    const cur = prodMap.get(i.descricao) ?? { qtd: 0, total: 0 }
    prodMap.set(i.descricao, { qtd: cur.qtd + Number(i.qtd), total: cur.total + Number(i.valor) * Number(i.qtd) })
  }))
  const topProdutos = [...prodMap.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.qtd - a.qtd).slice(0, 8)

  // Vendas por médico
  const medicoMap = new Map<string, { qtd: number; total: number }>()
  osP.forEach(o => {
    if (!o.medico) return
    const cur = medicoMap.get(o.medico) ?? { qtd: 0, total: 0 }
    medicoMap.set(o.medico, { qtd: cur.qtd + 1, total: cur.total + Number(o.total) })
  })
  const porMedico = [...medicoMap.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.total - a.total)

  // Desempenho de vendedores (O.S. + orçamentos)
  const vendMap = new Map<string, { qtd: number; total: number }>()
  ;[...osP, ...orcP].forEach(o => {
    if (!o.vendedor) return
    const cur = vendMap.get(o.vendedor) ?? { qtd: 0, total: 0 }
    vendMap.set(o.vendedor, { qtd: cur.qtd + 1, total: cur.total + Number(o.total) })
  })
  const porVendedor = [...vendMap.entries()].map(([nome, v]) => {
    const comissaoPct = vendedores.find(vd => vd.nome.toLowerCase() === nome.toLowerCase())?.comissao_percent ?? 0
    return { nome, ...v, comissao: v.total * Number(comissaoPct) / 100 }
  }).sort((a, b) => b.total - a.total)

  // Ticket médio por cliente (dentro do período selecionado)
  const qtdPorClienteVend: Record<string, number> = {}
  const gastoPorClienteVend: Record<string, number> = {}
  txP.filter(t => t.status === 'paid' && t.contact_id).forEach(t => {
    qtdPorClienteVend[t.contact_id!] = (qtdPorClienteVend[t.contact_id!] ?? 0) + 1
    gastoPorClienteVend[t.contact_id!] = (gastoPorClienteVend[t.contact_id!] ?? 0) + Number(t.amount)
  })
  const ticketPorCliente = Object.entries(gastoPorClienteVend)
    .map(([id, gasto]) => {
      const tx = txP.find(t => t.contact_id === id)
      return { nome: tx?.contacts?.name ?? tx?.contacts?.phone ?? '—', ticket: gasto / qtdPorClienteVend[id], qtd: qtdPorClienteVend[id] }
    })
    .sort((a, b) => b.ticket - a.ticket).slice(0, 8)

  // === META DO MÊS (sempre referente ao mês corrente, independente do filtro de período) ===
  async function salvarMeta() {
    setSavingMeta(true)
    const valor = parseFloat(metaInput.replace(',', '.')) || 0
    const r = await salvarMetaMensal(valor)
    setSavingMeta(false)
    if (!r?.error) { setMeta(valor); setMetaSalva(true); setTimeout(() => setMetaSalva(false), 2500) }
  }
  const nowMeta = new Date()
  const monthStartMeta = new Date(nowMeta.getFullYear(), nowMeta.getMonth(), 1).toISOString()
  const faturamentoMesAtual = transactions.filter(t => t.status === 'paid' && (t.paid_at ?? t.created_at) >= monthStartMeta).reduce((s, t) => s + Number(t.amount), 0)
  const pctMeta = meta > 0 ? Math.min(100, Math.round((faturamentoMesAtual / meta) * 100)) : 0

  // === DRE (Demonstrativo de Resultado) ===
  const despesasP = contasPagar.filter(c => c.status === 'pago' && c.pago_em && inRange(c.pago_em))
  const totalDespesas = despesasP.reduce((s, c) => s + Number(c.valor), 0)
  const lucroLiquido = faturamento - totalDespesas
  const fornecedorMap = new Map<string, number>()
  despesasP.forEach(c => {
    const nome = c.fornecedor || c.descricao
    fornecedorMap.set(nome, (fornecedorMap.get(nome) ?? 0) + Number(c.valor))
  })
  const despesasPorFornecedor = [...fornecedorMap.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total)

  // === ESTOQUE ===
  const valorEstoque = products.reduce((s, p) => s + (Number(p.cost_price) * (p.stock ?? 0)), 0)
  const valorVendaEstoque = products.reduce((s, p) => s + (Number(p.price) * (p.stock ?? 0)), 0)
  const margemMedia = products.length > 0
    ? Math.round(products.filter(p => p.price > 0).reduce((s, p) => s + ((p.price - p.cost_price) / p.price * 100), 0) / products.filter(p => p.price > 0).length)
    : 0
  const estoqueBaixo = products.filter(p => p.stock > 0 && p.stock <= 5)

  // === CLIENTES ===
  const umAnoAtras = new Date(); umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1)
  const recVencidas = receitas.filter(r => new Date(r.data_receita) < umAnoAtras)
  const mesAtual = new Date().getMonth() + 1
  const aniversariantes = contacts.filter(c => c.data_nascimento && new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1 === mesAtual)
  // Top clientes por gasto
  const clienteMap = new Map<string, number>()
  txP.filter(t => t.status === 'paid').forEach(t => {
    const nome = t.contacts?.name ?? t.contacts?.phone ?? '—'
    clienteMap.set(nome, (clienteMap.get(nome) ?? 0) + Number(t.amount))
  })
  const topClientes = [...clienteMap.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total).slice(0, 8)

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${cat === c.key ? 'text-white' : 'bg-white border border-[#EAE8E1] text-[#8C8880] hover:text-[#1A56FF]'}`}
              style={cat === c.key ? { background: 'linear-gradient(135deg,#1A56FF,#1445DD)', fontFamily: 'Barlow, sans-serif', boxShadow: '0 4px 12px rgba(26,86,255,0.3)' } : { fontFamily: 'Barlow, sans-serif' }}>
              <c.icon className="size-3.5" /> {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.key ? 'bg-[#1A56FF] text-white' : 'bg-white border border-[#EAE8E1] text-[#8C8880]'}`}
              style={{ fontFamily: 'Barlow, sans-serif' }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* VENDAS */}
      {cat === 'vendas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <MetricBig label="Faturamento" value={fmt(faturamento)} icon={TrendingUp} color="#0DB57A" bg="#E6F9F3" />
            <MetricBig label="Nº de Vendas" value={String(numVendas)} icon={ShoppingBag} color="#1A56FF" bg="#EEF2FF" />
            <MetricBig label="Ticket Médio" value={fmt(ticketMedio)} icon={BarChart2} color="#8B5CF6" bg="#F5F3FF" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ReportTable title="Produtos Mais Vendidos" icon={Package}
              rows={topProdutos.map((p, i) => ({ rank: i + 1, label: p.nome, sub: `${p.qtd} un.`, value: fmt(p.total) }))}
              empty="Nenhum produto vendido no período" />
            <ReportTable title="Vendas por Médico" icon={Stethoscope} accent="#8B5CF6"
              rows={porMedico.map((m, i) => ({ rank: i + 1, label: m.nome, sub: `${m.qtd} O.S.`, value: fmt(m.total) }))}
              empty="Nenhuma O.S. com médico no período" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ReportTable title="Desempenho de Vendedores" icon={Award} accent="#F59E0B"
              rows={porVendedor.map((v, i) => ({ rank: i + 1, label: v.nome, sub: `${v.qtd} vendas · comissão ${fmt(v.comissao)}`, value: fmt(v.total) }))}
              empty="Nenhuma venda com vendedor no período" />
            <ReportTable title="Ticket Médio por Cliente" icon={BarChart2} accent="#8B5CF6"
              rows={ticketPorCliente.map((c, i) => ({ rank: i + 1, label: c.nome, sub: `${c.qtd} compra${c.qtd > 1 ? 's' : ''}`, value: fmt(c.ticket) }))}
              empty="Sem vendas com cliente identificado no período" />
          </div>
        </div>
      )}

      {/* FINANCEIRO */}
      {cat === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <MetricBig label="Recebido" value={fmt(faturamento)} icon={DollarSign} color="#0DB57A" bg="#E6F9F3" />
            <MetricBig label="A Receber" value={fmt(txP.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0))} icon={TrendingUp} color="#F59E0B" bg="#FEF3C7" />
            <MetricBig label="Em Atraso" value={fmt(transactions.filter(t => t.status === 'overdue').reduce((s, t) => s + Number(t.amount), 0))} icon={DollarSign} color="#EF4444" bg="#FEF2F2" />
            <MetricBig label="Margem Média" value={`${margemMedia}%`} icon={Percent} color="#8B5CF6" bg="#F5F3FF" />
          </div>

          {/* Meta do mês */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                  <h3 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Meta do Mês</h3>
                </div>
                {metaSalva && <span className="flex items-center gap-1 text-xs font-bold text-[#0DB57A]"><Check className="size-3.5" /> Salvo</span>}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1 max-w-[180px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8C8880]">R$</span>
                  <input value={metaInput} onChange={e => setMetaInput(e.target.value)} placeholder="0,00"
                    className="w-full h-10 pl-8 pr-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF]" />
                </div>
                <button onClick={salvarMeta} disabled={savingMeta}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
                  {savingMeta ? <Loader2 className="size-3.5 animate-spin" /> : 'Salvar meta'}
                </button>
              </div>
              {meta > 0 ? (
                <>
                  <div className="flex items-center justify-between text-xs text-[#8C8880] mb-1.5">
                    <span>{fmt(faturamentoMesAtual)} de {fmt(meta)}</span>
                    <span className="font-bold" style={{ color: pctMeta >= 100 ? '#0DB57A' : '#1A56FF' }}>{pctMeta}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#F7F6F3] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pctMeta}%`, background: pctMeta >= 100 ? '#0DB57A' : '#1A56FF' }} />
                  </div>
                </>
              ) : <p className="text-xs text-[#C8C5BB]">Defina uma meta de faturamento mensal para acompanhar o progresso.</p>}
            </div>
          </GlowCard>

          <ReportTable title="Maiores Clientes (por gasto)" icon={Crown} accent="#F59E0B"
            rows={topClientes.map((c, i) => ({ rank: i + 1, label: c.nome, sub: '', value: fmt(c.total) }))}
            empty="Sem dados de venda no período" />
        </div>
      )}

      {/* DRE */}
      {cat === 'dre' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <MetricBig label="Receita Total" value={fmt(faturamento)} icon={TrendingUp} color="#0DB57A" bg="#E6F9F3" />
            <MetricBig label="Despesas Totais" value={fmt(totalDespesas)} icon={DollarSign} color="#EF4444" bg="#FEF2F2" />
            <MetricBig label="Lucro Líquido" value={fmt(lucroLiquido)} icon={Scale} color={lucroLiquido >= 0 ? '#0DB57A' : '#EF4444'} bg={lucroLiquido >= 0 ? '#E6F9F3' : '#FEF2F2'} />
          </div>
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                <h3 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Demonstrativo de Resultado</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-[#F7F6F3]"><span className="text-[#8C8880]">(+) Receita total</span><span className="font-bold text-[#0DB57A]">{fmt(faturamento)}</span></div>
                <div className="flex items-center justify-between py-2 border-b border-[#F7F6F3]"><span className="text-[#8C8880]">(−) Despesas pagas</span><span className="font-bold text-red-500">{fmt(totalDespesas)}</span></div>
                <div className="flex items-center justify-between py-2.5"><span className="font-bold text-[#1C1B18]">(=) Lucro líquido</span><span className="text-lg font-black" style={{ fontFamily: 'Fraunces, serif', color: lucroLiquido >= 0 ? '#0DB57A' : '#EF4444' }}>{fmt(lucroLiquido)}</span></div>
              </div>
            </div>
          </GlowCard>
          <ReportTable title="Despesas por Fornecedor" icon={DollarSign} accent="#EF4444"
            rows={despesasPorFornecedor.map((d, i) => ({ rank: i + 1, label: d.nome, sub: '', value: fmt(d.total) }))}
            empty="Nenhuma despesa paga no período" />
        </div>
      )}

      {/* ESTOQUE */}
      {cat === 'estoque' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <MetricBig label="Valor em Estoque (custo)" value={fmt(valorEstoque)} icon={Package} color="#1A56FF" bg="#EEF2FF" />
            <MetricBig label="Valor em Estoque (venda)" value={fmt(valorVendaEstoque)} icon={DollarSign} color="#0DB57A" bg="#E6F9F3" />
            <MetricBig label="Margem Média" value={`${margemMedia}%`} icon={Percent} color="#8B5CF6" bg="#F5F3FF" />
          </div>
          <ReportTable title="Produtos com Estoque Baixo" icon={Package} accent="#F59E0B"
            rows={estoqueBaixo.map((p) => ({ rank: p.stock, label: p.name, sub: p.tipo_produto ?? '', value: `${p.stock} un.` }))}
            empty="Nenhum produto com estoque baixo 🎉" rankLabel />
        </div>
      )}

      {/* CLIENTES */}
      {cat === 'clientes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <MetricBig label="Total de Clientes" value={String(contacts.length)} icon={Users} color="#1A56FF" bg="#EEF2FF" />
            <MetricBig label="Aniversariantes do Mês" value={String(aniversariantes.length)} icon={Award} color="#F59E0B" bg="#FEF3C7" />
            <MetricBig label="Receitas Vencidas" value={String(recVencidas.length)} icon={Eye} color="#8B5CF6" bg="#F5F3FF" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ReportTable title="Receitas Vencidas (oportunidade de revisão)" icon={Eye} accent="#8B5CF6"
              rows={recVencidas.slice(0, 10).map((r, i) => ({ rank: i + 1, label: r.contacts?.name ?? r.contacts?.phone ?? '—', sub: `Receita de ${new Date(r.data_receita + 'T12:00:00').toLocaleDateString('pt-BR')}`, value: '' }))}
              empty="Nenhuma receita vencida" />
            <ReportTable title="Aniversariantes do Mês" icon={Award} accent="#F59E0B"
              rows={aniversariantes.map((c, i) => ({ rank: i + 1, label: c.name ?? c.phone, sub: `Dia ${new Date(c.data_nascimento! + 'T12:00:00').getDate()}`, value: '' }))}
              empty="Nenhum aniversariante este mês" />
          </div>

          {/* Relatório completo de clientes e contatos */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
                <h3 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Clientes e Contatos</h3>
              </div>
              {contacts.length === 0 ? (
                <p className="text-sm text-[#C8C5BB] text-center py-6">Nenhum contato cadastrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#EAE8E1]">
                        {['Nome', 'Telefone', 'E-mail', 'Origem', 'Cadastro'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#8C8880]" style={{ fontFamily: 'Barlow, sans-serif' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F7F6F3]">
                      {contacts.map(c => (
                        <tr key={c.id}>
                          <td className="px-3 py-2.5 font-semibold text-[#1C1B18]">{c.name ?? '—'}</td>
                          <td className="px-3 py-2.5 text-[#8C8880]">{c.phone}</td>
                          <td className="px-3 py-2.5 text-[#8C8880] flex items-center gap-1">{c.email ? <><Mail className="size-3" /> {c.email}</> : '—'}</td>
                          <td className="px-3 py-2.5 text-[#8C8880]">{c.origem ? <span className="flex items-center gap-1"><Tag className="size-3" /> {c.origem}</span> : '—'}</td>
                          <td className="px-3 py-2.5 text-[#8C8880]">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </GlowCard>
        </div>
      )}
    </div>
  )
}

function MetricBig({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: typeof Eye; color: string; bg: string }) {
  return (
    <GlowCard><div className="p-5 flex items-center justify-between">
      <div><p className="text-[10px] font-bold text-[#8C8880] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Barlow, sans-serif' }}>{label}</p>
      <p className="text-2xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>{value}</p></div>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg }}><Icon className="size-5" style={{ color }} strokeWidth={1.5} /></div>
    </div></GlowCard>
  )
}

function ReportTable({ title, icon: Icon, rows, empty, accent = '#1A56FF', rankLabel = false }: {
  title: string; icon: typeof Eye; accent?: string; rankLabel?: boolean
  rows: { rank: number; label: string; sub: string; value: string }[]; empty: string
}) {
  return (
    <GlowCard>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="size-4" style={{ color: accent }} strokeWidth={1.5} />
          <h3 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{title}</h3>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-[#C8C5BB] text-center py-6">{empty}</p>
        ) : (
          <div className="divide-y divide-[#F7F6F3]">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                    style={{ background: i === 0 ? accent : '#F7F6F3', color: i === 0 ? 'white' : '#8C8880', fontFamily: 'Fraunces, serif' }}>
                    {rankLabel ? r.rank : i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#1C1B18]">{r.label}</p>
                    {r.sub && <p className="text-xs text-[#8C8880]">{r.sub}</p>}
                  </div>
                </div>
                {r.value && <span className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{r.value}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  )
}
