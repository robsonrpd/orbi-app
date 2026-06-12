'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, DollarSign,
  Bot, MessageSquare, Settings, LogOut, Eye,
  Scissors, Clock, Package, Star, Glasses, FileText, UserCog, ClipboardList, BarChart3, Wallet, SlidersHorizontal, Crown, Gift,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { saveCompanyLogo } from '@/lib/actions/empresa'
import { ModoFuncionario } from '@/components/orbi/modo-funcionario'
import { BLOQUEIO_POR_HREF } from '@/lib/permissoes'

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
  { href: '/dashboard/indicacoes', label: 'Ganhe uma Mensalidade', icon: Gift },
  { href: '/dashboard/conversas', label: 'Conversas', icon: MessageSquare },
  { href: '/dashboard/ia', label: 'Inteligência IA', icon: Bot },
]

type ModoProps = { funcionario: boolean; bloqueios: string[]; temPin: boolean; vendedorNome: string | null; fonte?: 'login' | 'cookie' | null }
type VendedorMini = { id: string; nome: string }

export function Sidebar({ companyName, logoUrl, canEditLogo = true, modo, vendedores = [], esconderNicho = [] }: { companyName?: string; logoUrl?: string | null; canEditLogo?: boolean; modo?: ModoProps; vendedores?: VendedorMini[]; esconderNicho?: string[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const m = modo ?? { funcionario: false, bloqueios: [], temPin: false, vendedorNome: null, fonte: null }
  const visibleNav = navItems.filter(item => {
    // 1) módulos que não pertencem ao nicho da empresa
    if (esconderNicho.includes(item.href)) return false
    // 2) módulos bloqueados para o vendedor logado
    if (!m.funcionario) return true
    const bloq = BLOQUEIO_POR_HREF[item.href]
    return !(bloq && m.bloqueios.includes(bloq))
  })
  const [logo, setLogo] = useState<string | null>(logoUrl ?? null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) {
        setLogo(data.url)
        await saveCompanyLogo(data.url)
      }
    } catch { /* ignora */ }
    setUploadingLogo(false)
  }

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

      {/* Logo da loja (upload) */}
      <div className="relative z-10 px-4 pt-4 pb-3 border-b border-white/5">
        <div
          onClick={() => canEditLogo && !uploadingLogo && logoInputRef.current?.click()}
          className={`group relative rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center h-20 ${canEditLogo ? 'cursor-pointer hover:border-[#1A56FF]/60' : ''} transition-colors`}>
          {logo ? (
            <img src={logo} alt={companyName ?? 'Logo'} className="w-full h-full object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-white/40">
              {uploadingLogo ? <Loader2 className="size-5 animate-spin" />
                : <><Camera className="size-5" strokeWidth={1.5} /><span className="text-[10px]">Adicionar logo</span></>}
            </div>
          )}
          {canEditLogo && logo && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploadingLogo ? <Loader2 className="size-5 animate-spin text-white" />
                : <span className="flex items-center gap-1 text-[11px] font-semibold text-white"><Camera className="size-3.5" /> Trocar</span>}
            </div>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>
        {companyName && <p className="text-center text-xs font-semibold text-white/70 mt-2 truncate">{companyName}</p>}
        <Link href="/dashboard" className="flex items-center justify-center gap-1 mt-1.5">
          <span className="text-sm font-black text-white/40 tracking-tight" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.03em' }}>
            <Eye className="size-3 inline mb-0.5 mr-0.5" strokeWidth={2} />Orbi<span style={{ color: '#1A56FF' }}>.</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-[2px] px-3 pb-2 pt-1"
          style={{ fontFamily: 'Barlow, sans-serif' }}>Menu</p>
        {visibleNav.map((item) => {
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
        {m.fonte === 'login' && <ModoFuncionario vendedorNome={m.vendedorNome} fonte={m.fonte} />}
        {!m.funcionario && (
          <>
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
          </>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="size-4 shrink-0 text-white/50" strokeWidth={1.5} />
          Sair
        </button>
      </div>
    </aside>
  )
}
