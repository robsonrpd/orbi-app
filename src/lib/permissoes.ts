// Lista única de permissões do vendedor.
// `href` = item de menu que some quando bloqueado; null = ação especial (sem menu próprio).
export const PERMISSOES: { key: string; label: string; href: string | null }[] = [
  { key: 'faturamento', label: 'Ver faturamento e valores (Dashboard)', href: null },
  { key: 'clientes', label: 'Clientes', href: '/dashboard/clientes' },
  { key: 'funil', label: 'Funil de Leads', href: '/dashboard/funil' },
  { key: 'agenda', label: 'Agendamentos', href: '/dashboard/agenda' },
  { key: 'servicos', label: 'Serviços', href: '/dashboard/servicos' },
  { key: 'funcionamento', label: 'Funcionamento (horários)', href: '/dashboard/funcionamento' },
  { key: 'receitas', label: 'Receitas (RX)', href: '/dashboard/receitas' },
  { key: 'orcamentos', label: 'Orçamentos', href: '/dashboard/orcamentos' },
  { key: 'ordens', label: 'Ordens de Serviço', href: '/dashboard/ordens-servico' },
  { key: 'produtos', label: 'Produtos / Estoque / Vendas', href: '/dashboard/produtos' },
  { key: 'precos', label: 'Alterar preços de produtos', href: null },
  { key: 'financeiro', label: 'Financeiro', href: '/dashboard/financeiro' },
  { key: 'caixa', label: 'Caixa', href: '/dashboard/caixa' },
  { key: 'relatorios', label: 'Relatórios', href: '/dashboard/relatorios' },
  { key: 'vendedores', label: 'Gerenciar Vendedores', href: '/dashboard/vendedores' },
  { key: 'avaliacoes', label: 'Avaliações', href: '/dashboard/avaliacoes' },
  { key: 'indicacoes', label: 'Ganhe uma Mensalidade', href: '/dashboard/indicacoes' },
  { key: 'conversas', label: 'Conversas', href: '/dashboard/conversas' },
  { key: 'ia', label: 'Inteligência IA', href: '/dashboard/ia' },
]

// Mapa href -> chave de bloqueio (para esconder menus no Modo Vendedor)
export const BLOQUEIO_POR_HREF: Record<string, string> = Object.fromEntries(
  PERMISSOES.filter(p => p.href).map(p => [p.href as string, p.key])
)
