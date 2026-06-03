'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Bot,
  MessageSquare,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agenda', label: 'Agenda', icon: Calendar },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/dashboard/conversas', label: 'Conversas', icon: MessageSquare },
  { href: '/dashboard/ia', label: 'Inteligência IA', icon: Bot },
]

const bottomItems = [
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
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
    <aside className="w-60 shrink-0 bg-white border-r border-[#EAE8E1] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#EAE8E1]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1A56FF] rounded-lg flex items-center justify-center">
            <Zap className="size-4 text-white fill-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[#1C1B18]"
            style={{ fontFamily: 'Fraunces, serif' }}>
            Orbi<span className="text-[#1A56FF]">.</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive(item.href, item.exact)
                ? 'bg-[#EEF2FF] text-[#1A56FF]'
                : 'text-[#8C8880] hover:bg-[#F7F6F3] hover:text-[#2E2D29]'
            )}
          >
            <item.icon className={cn(
              'size-4 shrink-0',
              isActive(item.href, item.exact) ? 'text-[#1A56FF]' : 'text-[#C8C5BB]'
            )} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#EAE8E1] space-y-0.5">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive(item.href)
                ? 'bg-[#EEF2FF] text-[#1A56FF]'
                : 'text-[#8C8880] hover:bg-[#F7F6F3] hover:text-[#2E2D29]'
            )}
          >
            <item.icon className="size-4 shrink-0 text-[#C8C5BB]" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8C8880] hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut className="size-4 shrink-0 text-[#C8C5BB]" />
          Sair
        </button>
      </div>
    </aside>
  )
}
