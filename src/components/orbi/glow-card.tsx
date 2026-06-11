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
      style={glow ? { boxShadow: '0 8px 28px rgba(13,38,76,0.12), 0 2px 8px rgba(13,38,76,0.06)' } : {}}>
      {children}
    </div>
  )
}
