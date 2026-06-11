'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { criarIndicacao } from '@/lib/actions/indicacoes'
import {
  Gift, ArrowRight, Loader2, CheckCircle2, Send, User, Mail, Phone,
  MessageCircle, Sparkles, ArrowLeft,
} from 'lucide-react'

type Indicacao = {
  id: string; colaborador: string | null; indicado_nome: string
  indicado_email: string | null; indicado_telefone: string | null
  status: string; created_at: string
}

const STEPS = [
  { key: 'colaborador', icon: User, label: 'Para começar, qual o seu nome?', hint: 'Nome do colaborador responsável pela indicação.', placeholder: 'Seu nome', required: false },
  { key: 'indicadoNome', icon: Sparkles, label: 'Qual o nome da pessoa que deseja indicar?', hint: 'Com quem nosso time de vendas irá falar.', placeholder: 'Nome do indicado', required: true },
  { key: 'indicadoEmail', icon: Mail, label: 'Qual o e-mail da pessoa/ótica indicada?', hint: 'Opcional, mas ajuda no contato.', placeholder: 'email@exemplo.com', required: false },
  { key: 'indicadoTelefone', icon: Phone, label: 'Qual o WhatsApp da pessoa indicada?', hint: 'É por aqui que vamos apresentar o Orbi.', placeholder: '(85) 99999-9999', required: true },
] as const

export function IndicacoesClient({ indicacoes }: { indicacoes: Indicacao[] }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ colaborador: '', indicadoNome: '', indicadoEmail: '', indicadoTelefone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const current = STEPS[step]
  const value = form[current.key]

  function next() {
    if (current.required && !value.trim()) { setError('Esse campo é obrigatório.'); return }
    setError(null)
    if (step < STEPS.length - 1) setStep(step + 1)
    else submit()
  }

  async function submit() {
    setLoading(true); setError(null)
    const result = await criarIndicacao(form)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setDone(true)
  }

  function linkWhatsIndicado(ind: { indicado_nome: string; indicado_telefone: string | null }) {
    const tel = (ind.indicado_telefone ?? '').replace(/\D/g, '')
    const fone = tel.startsWith('55') ? tel : `55${tel}`
    const msg = encodeURIComponent(
      `Olá ${ind.indicado_nome.split(' ')[0]},\n\nSomos da Orbi Sistemas! Você foi indicado por um de nossos clientes para conhecer como nosso sistema pode ajudar no gerenciamento da sua loja. Podemos agendar uma call rapidinha para te apresentar o sistema?`
    )
    return `https://wa.me/${fone}?text=${msg}`
  }

  function reset() {
    setForm({ colaborador: '', indicadoNome: '', indicadoEmail: '', indicadoTelefone: '' })
    setStep(0); setDone(false); setError(null)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="rounded-2xl p-6 flex items-center justify-between gap-4 overflow-hidden relative"
        style={{ background: 'linear-gradient(120deg, #0DB57A, #059669)' }}>
        <div className="relative z-10">
          <p className="text-2xl font-black text-white" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>Indique e Ganhe 💸</p>
          <p className="text-sm text-white/90 mt-1 max-w-md">A sua próxima mensalidade pode ser por nossa conta! Indique outra ótica e ganhe desconto.</p>
          <p className="text-[11px] text-white/70 mt-2">*Válido após o pagamento da 3ª mensalidade do indicado.</p>
        </div>
        <Gift className="size-24 text-white/20 shrink-0" strokeWidth={1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulário typebot */}
        <div className="lg:col-span-3">
          <GlowCard>
            <div className="p-8 min-h-[340px] flex flex-col">
              {done ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#E6F9F3] flex items-center justify-center">
                    <CheckCircle2 className="size-8 text-[#0DB57A]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>Indicação registrada! 🎉</h3>
                  <p className="text-sm text-[#8C8880] max-w-xs">Nosso time vai entrar em contato com <strong>{form.indicadoNome}</strong>. Quer adiantar e mandar a mensagem agora?</p>
                  <div className="flex gap-2 mt-2">
                    <a href={linkWhatsIndicado({ indicado_nome: form.indicadoNome, indicado_telefone: form.indicadoTelefone })} target="_blank"
                      className="flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold text-white" style={{ background: '#0DB57A' }}>
                      <MessageCircle className="size-4" /> Enviar no WhatsApp
                    </a>
                    <button onClick={reset} className="h-11 px-4 rounded-xl text-sm font-semibold text-[#8C8880] border border-[#EAE8E1]">Nova indicação</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Progresso */}
                  <div className="flex items-center gap-1.5 mb-6">
                    {STEPS.map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#0DB57A]' : 'bg-[#EAE8E1]'}`} />
                    ))}
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-[#0DB57A] uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow, sans-serif' }}>
                      Pergunta {step + 1} de {STEPS.length}
                    </p>
                    <h3 className="text-xl font-black text-[#1C1B18] mb-1" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.01em' }}>
                      {current.label}{current.required && <span className="text-red-400"> *</span>}
                    </h3>
                    <p className="text-sm text-[#8C8880] mb-4">{current.hint}</p>

                    <input autoFocus value={value}
                      onChange={e => setForm({ ...form, [current.key]: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); next() } }}
                      placeholder={current.placeholder}
                      className="w-full h-12 px-4 rounded-xl border-2 border-[#EAE8E1] bg-[#F7F6F3] text-base outline-none focus:border-[#0DB57A] transition-all placeholder:text-[#C8C5BB]" />

                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <button onClick={() => { setError(null); setStep(Math.max(0, step - 1)) }} disabled={step === 0}
                      className="flex items-center gap-1 text-sm font-semibold text-[#8C8880] disabled:opacity-0">
                      <ArrowLeft className="size-4" /> Voltar
                    </button>
                    <button onClick={next} disabled={loading}
                      className="flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                      style={{ fontFamily: 'Barlow, sans-serif', background: '#0DB57A', boxShadow: '0 4px 16px rgba(13,181,122,0.35)' }}>
                      {loading ? <Loader2 className="size-4 animate-spin" />
                        : step === STEPS.length - 1 ? <><Send className="size-4" /> Enviar Indicação</>
                        : <>Continuar <ArrowRight className="size-4" /></>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </GlowCard>
        </div>

        {/* Lista de indicações */}
        <div className="lg:col-span-2">
          <GlowCard>
            <div className="p-5">
              <h3 className="text-sm font-black text-[#1C1B18] mb-3" style={{ fontFamily: 'Fraunces, serif' }}>Suas indicações ({indicacoes.length})</h3>
              {indicacoes.length === 0 ? (
                <p className="text-sm text-[#C8C5BB] text-center py-8">Nenhuma indicação ainda.<br />Comece pelo formulário ao lado!</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {indicacoes.map(ind => (
                    <div key={ind.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F6F3]">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1C1B18] truncate">{ind.indicado_nome}</p>
                        <p className="text-xs text-[#C8C5BB]">{new Date(ind.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {ind.indicado_telefone && (
                        <a href={linkWhatsIndicado(ind)} target="_blank"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#0DB57A] hover:bg-[#E6F9F3] transition-colors shrink-0">
                          <MessageCircle className="size-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  )
}
