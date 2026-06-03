'use client'

import { AppointmentStatus, TransactionStatus } from '@/lib/utils/types'
import { cn } from '@/lib/utils'

const appointmentLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
}

const appointmentColors: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-[#E6F9F3] text-[#0DB57A] border-[#0DB57A]/20',
  completed: 'bg-[#E6F9F3] text-[#0DB57A] border-[#0DB57A]/20',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  no_show: 'bg-amber-50 text-amber-600 border-amber-200',
}

const transactionLabels: Record<TransactionStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}

const transactionColors: Record<TransactionStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-[#E6F9F3] text-[#0DB57A] border-[#0DB57A]/20',
  overdue: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
}

export function AppointmentBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border font-[family-name:var(--font-barlow)] tracking-wide',
      appointmentColors[status]
    )}>
      {appointmentLabels[status]}
    </span>
  )
}

export function TransactionBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border font-[family-name:var(--font-barlow)] tracking-wide',
      transactionColors[status]
    )}>
      {transactionLabels[status]}
    </span>
  )
}
