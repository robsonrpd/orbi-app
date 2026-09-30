// O que o produto oferece hoje.
//
// O Orbi nasceu como sistema de gestão completo (vendas, estoque, caixa, O.S., receitas...).
// Hoje a oferta é só CRM de leads que chegam pelo WhatsApp. Em vez de apagar os outros
// módulos, eles ficam DESLIGADOS por esta chave: o código e as tabelas continuam lá, e
// reativar um módulo é acrescentar a rota dele em ROTAS_CRM (ou desligar MODO_CRM).
//
// Esta lista vale para o menu, para a URL digitada na mão e para as permissões do vendedor
// — tudo sai daqui, pra nunca sobrar um caminho até um módulo desligado.

// tipado como boolean (e não como o literal `true`) pra o TypeScript não tratar o outro
// lado das condições como código impossível — assim ligar/desligar a chave continua valendo
export const MODO_CRM: boolean = true

/** Para onde vai quem entra no sistema (e quem cai numa tela desligada). */
export const ROTA_INICIAL = '/dashboard/funil'

/** Telas que existem no modo CRM. Tudo o mais em /dashboard/* fica inacessível. */
export const ROTAS_CRM: string[] = [
  '/dashboard/funil',        // funil de leads (o centro do produto)
  '/dashboard/conversas',    // conversas do WhatsApp
  '/dashboard/clientes',     // lista de contatos/leads
  '/dashboard/vendedores',   // equipe e rodízio de atendimento
  '/dashboard/atendimento',  // boas-vindas, alerta de demora e follow-up automáticos
  '/dashboard/ia',           // conexão do WhatsApp (QR Code)
  '/dashboard/settings',     // conta
  '/dashboard/plano',        // assinatura
]

/** A rota está disponível? Fora de /dashboard nada é filtrado (login, fichas, APIs). */
export function rotaPermitida(pathname: string): boolean {
  if (!MODO_CRM) return true
  if (pathname !== '/dashboard' && !pathname.startsWith('/dashboard/')) return true
  return ROTAS_CRM.some(r => pathname === r || pathname.startsWith(r + '/'))
}

/** Precisa mandar pra tela inicial? (a home antiga /dashboard era um painel financeiro) */
export function deveRedirecionar(pathname: string): boolean {
  if (!MODO_CRM) return false
  if (pathname === '/dashboard' || pathname === '/dashboard/') return true
  return !rotaPermitida(pathname)
}
