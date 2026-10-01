'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlowCard } from '@/components/orbi/glow-card'
import { KeyRound, Loader2, Check } from 'lucide-react'

const SENHA_MIN = 8

/**
 * Troca de senha dentro do sistema, sem e-mail. É também o que dá fim à senha temporária: quem recebe uma
 * do suporte (ou do dono da loja) entra com ela e troca aqui por uma sua.
 * Pede a senha ATUAL antes: sem isso, quem encontrar o computador de alguém logado e destravado trocaria a senha.
 */
export function AlterarSenha({ email }: { email: string }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null); setOk(false)
    if (nova.length < SENHA_MIN) { setErro(`A nova senha precisa de ao menos ${SENHA_MIN} caracteres.`); return }
    if (nova !== confirma) { setErro('A confirmação não é igual à nova senha.'); return }
    if (nova === atual) { setErro('A nova senha precisa ser diferente da atual.'); return }

    setSalvando(true)
    const supabase = createClient()
    const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: atual })
    if (e1) { setErro('A senha atual está incorreta.'); setSalvando(false); return }
    const { error: e2 } = await supabase.auth.updateUser({ password: nova })
    setSalvando(false)
    if (e2) { setErro('Não foi possível trocar a senha. Tente de novo.'); return }
    setOk(true); setAtual(''); setNova(''); setConfirma('')
  }

  const inputCls = 'w-full h-11 px-3 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm text-[#1C1B18] placeholder:text-[#C8C5BB] outline-none transition-all focus:border-[#1A56FF] focus:bg-white focus:ring-4 focus:ring-[#1A56FF]/10'

  return (
    <GlowCard>
      <form onSubmit={salvar} className="p-5 space-y-3 max-w-md">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-[#1A56FF]" strokeWidth={1.5} />
          <h2 className="text-sm font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Alterar senha</h2>
        </div>
        <p className="text-xs text-[#8C8880]">Recebeu uma senha temporária? Entre com ela e troque aqui por uma sua.</p>
        <input type="password" autoComplete="current-password" placeholder="Senha atual" value={atual} onChange={e => setAtual(e.target.value)} required className={inputCls} />
        <input type="password" autoComplete="new-password" placeholder={`Nova senha (mín. ${SENHA_MIN} caracteres)`} value={nova} onChange={e => setNova(e.target.value)} required className={inputCls} />
        <input type="password" autoComplete="new-password" placeholder="Repita a nova senha" value={confirma} onChange={e => setConfirma(e.target.value)} required className={inputCls} />
        {erro && <p className="text-xs text-red-500">{erro}</p>}
        {ok && <p className="text-xs text-[#0DB57A] flex items-center gap-1"><Check className="size-3.5" strokeWidth={2.5} /> Senha alterada. Use a nova no próximo acesso.</p>}
        <button type="submit" disabled={salvando}
          className="h-11 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-60" style={{ background: '#1A56FF' }}>
          {salvando ? <Loader2 className="size-4 animate-spin" /> : 'Alterar senha'}
        </button>
      </form>
    </GlowCard>
  )
}
