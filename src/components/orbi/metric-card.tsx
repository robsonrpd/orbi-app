import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

type MetricCardProps = {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: number
  accent?: string
}

export function MetricCard({
  title, value, subtitle, icon: Icon,
  iconColor = 'text-[#1A56FF]',
  iconBg = 'bg-[#EEF2FF]',
  trend,
  accent,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#EAE8E1] p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow group"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('size-4', iconColor)} strokeWidth={1.5} />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trend >= 0 ? 'bg-[#E6F9F3] text-[#0DB57A]' : 'bg-red-50 text-red-500'
          )}>
            {trend >= 0
              ? <TrendingUp className="size-3" strokeWidth={2} />
              : <TrendingDown className="size-3" strokeWidth={2} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-xl font-black text-[#1C1B18] leading-none"
          style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
          {value}
        </p>
        <p className="text-xs text-[#8C8880] mt-1.5 font-medium">{title}</p>
        {subtitle && (
          <p className="text-[11px] text-[#C8C5BB] mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Barra de acento colorida */}
      {accent && (
        <div className="h-0.5 rounded-full w-8 group-hover:w-12 transition-all duration-300"
          style={{ background: accent }} />
      )}
    </div>
  )
}
