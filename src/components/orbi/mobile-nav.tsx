'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type MobileNavCtx = { open: boolean; setOpen: (v: boolean) => void }

const MobileNavContext = createContext<MobileNavCtx | null>(null)

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // fecha o menu ao navegar para outra página (mobile)
  useEffect(() => { setOpen(false) }, [pathname])

  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav deve ser usado dentro de MobileNavProvider')
  return ctx
}
