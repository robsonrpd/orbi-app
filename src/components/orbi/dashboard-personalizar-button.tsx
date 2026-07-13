'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PersonalizarDashboardModal } from '@/components/orbi/personalizar-dashboard-modal'
import type { DashboardItemState } from '@/lib/actions/dashboard-config'
import { Settings2 } from 'lucide-react'

type Props = { isGeral: boolean; kpis: DashboardItemState[]; resumo: DashboardItemState[]; secoes: DashboardItemState[] }

export function DashboardPersonalizarButton({ isGeral, kpis, resumo, secoes }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[#EAE8E1] bg-white text-xs font-semibold text-[#8C8880] hover:border-[#1A56FF] hover:text-[#1A56FF] transition-colors shrink-0">
        <Settings2 className="size-3.5" /> Personalizar
      </button>
      <PersonalizarDashboardModal
        open={open} isGeral={isGeral} kpis={kpis} resumo={resumo} secoes={secoes}
        onClose={() => setOpen(false)}
        onSalvo={() => router.refresh()}
      />
    </>
  )
}
