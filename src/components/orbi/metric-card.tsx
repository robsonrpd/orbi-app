import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

type MetricCardProps = {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: number
}

export function MetricCard({ title, value, subtitle, icon: Icon, iconColor = 'text-[#1A56FF]', iconBg = 'bg-[#EEF2FF]', trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#EAE8E1] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('size-5', iconColor)} />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trend > 0 ? 'bg-[#E6F9F3] text-[#0DB57A]' :
            trend < 0 ? 'bg-red-50 text-red-500' :
            'bg-gray-50 text-gray-400'
          )}>
            {trend > 0 ? <TrendingUp className="size-3" /> :
             trend < 0 ? <TrendingDown className="size-3" /> :
             <Minus className="size-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
          {value}
        </p>
        <p className="text-sm text-[#8C8880] mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-[#C8C5BB] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
