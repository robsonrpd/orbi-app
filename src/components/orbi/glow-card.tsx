import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type GlowCardProps = {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function GlowCard({ children, className, glow = true }: GlowCardProps) {
  return (
    <div className={cn(glow ? 'glow-card' : 'bg-white rounded-[14px] border border-[#EAE8E1]', className)}
      style={glow ? { boxShadow: '0 2px 16px rgba(0,0,0,0.06)' } : {}}>
      {children}
    </div>
  )
}
