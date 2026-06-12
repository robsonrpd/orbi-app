'use client'

import { UserCog } from 'lucide-react'

// Mostra apenas um aviso quando um VENDEDOR está logado com a própria conta.
// (O antigo "Operar como vendedor" + PIN foi removido — cada vendedor tem login próprio.)
export function ModoFuncionario({ vendedorNome, fonte }: {
  vendedorNome: string | null
  fonte?: 'login' | 'cookie' | null
  funcionario?: boolean
  temPin?: boolean
  vendedores?: { id: string; nome: string }[]
}) {
  if (fonte !== 'login') return null
  return (
    <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#93AAFF] bg-white/5">
      <UserCog className="size-4 shrink-0" strokeWidth={1.5} />
      <span className="truncate">Vendedor: {vendedorNome}</span>
    </div>
  )
}
