// Separador de dia no meio da conversa, como no WhatsApp: "Hoje", "Ontem", dia da semana (última semana) ou a data.
const DIA_MS = 86_400_000

function inicioDoDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function rotuloDia(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const dias = Math.round((inicioDoDia(new Date()) - inicioDoDia(d)) / DIA_MS)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias > 1 && dias < 7) {
    const s = d.toLocaleDateString('pt-BR', { weekday: 'long' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Mostra o rótulo só quando o dia desta mensagem é diferente do da mensagem anterior. */
export function SeparadorDia({ ts, anterior }: { ts?: string; anterior?: string }) {
  if (!ts) return null
  const d = new Date(ts)
  if (isNaN(d.getTime())) return null
  if (anterior) {
    const a = new Date(anterior)
    if (!isNaN(a.getTime()) && inicioDoDia(a) === inicioDoDia(d)) return null
  }
  return (
    <div className="flex justify-center py-1.5 select-none">
      <span className="text-[11px] font-semibold text-[#5C5A54] bg-white/90 rounded-lg px-2.5 py-1 shadow-sm">{rotuloDia(ts)}</span>
    </div>
  )
}
