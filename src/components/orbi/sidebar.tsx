'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, DollarSign,
  Bot, MessageSquare, Settings, LogOut, Eye,
  Scissors, Clock, Package, Star, Glasses, FileText, UserCog, ClipboardList, BarChart3, Wallet, SlidersHorizontal, Crown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/funcionamento', label: 'Funcionamento', icon: Clock },
  { href: '/dashboard/agenda', label: 'Agendamentos', icon: Calendar },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/vendedores', label: 'Vendedores', icon: UserCog },
  { href: '/dashboard/receitas', label: 'Receitas (RX)', icon: Glasses },
  { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: ClipboardList },
  { href: '/dashboard/ordens-servico', label: 'Ordens de Serviço', icon: FileText },
  { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/dashboard/caixa', label: 'Caixa', icon: Wallet },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/avaliacoes', label: 'Avaliações', icon: Star },
  { href: '/dashboard/conversas', label: 'Conversas', icon: MessageSquare },
  { href: '/dashboard/ia', label: 'Inteligência IA', icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: 'linear-gradient(180deg, #0A0F1E 0%, #0D1635 100%)' }}>
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      {/* Logo */}
      <div className="relative z-10 px-5 py-5 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#1A56FF', boxShadow: '0 0 16px rgba(26,86,255,0.5)' }}>
            <Eye className="size-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-2xl font-black text-white tracking-tight"
            style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
            Orbi<span style={{ color: '#1A56FF' }}>.</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-[2px] px-3 pb-2 pt-1"
          style={{ fontFamily: 'Barlow, sans-serif' }}>Menu</p>
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
              style={active ? { background: 'rgba(26,86,255,0.2)', boxShadow: 'inset 0 0 0 1px rgba(26,86,255,0.3)' } : {}}>
              <item.icon className={cn('size-4 shrink-0 transition-colors', active ? 'text-[#93AAFF]' : 'text-white/50 group-hover:text-white/80')} strokeWidth={1.5} />
              <span>{item.label}</span>
              {active && <span className="ml-auto w-1 h-4 rounded-full bg-[#1A56FF]" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="relative z-10 px-3 py-4 border-t border-white/5 space-y-0.5">
        <Link href="/dashboard/plano"
          className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            isActive('/dashboard/plano') ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5')}>
          <Crown className="size-4 shrink-0 text-[#F59E0B]" strokeWidth={1.5} />
          Seu Plano
        </Link>
        <Link href="/dashboard/parametros"
          className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            isActive('/dashboard/parametros') ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5')}>
          <SlidersHorizontal className="size-4 shrink-0 text-white/50" strokeWidth={1.5} />
          Parâmetros
        </Link>
        <Link href="/dashboard/settings"
          className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            isActive('/dashboard/settings') ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5')}>
          <Settings className="size-4 shrink-0 text-white/50" strokeWidth={1.5} />
          Configurações
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="size-4 shrink-0 text-white/50" strokeWidth={1.5} />
          Sair
        </button>
      </div>
    </aside>
  )
}
