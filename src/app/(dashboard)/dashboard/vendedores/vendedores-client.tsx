'use client'

import { useState, useRef } from 'react'
import { GlowCard } from '@/components/orbi/glow-card'
import { createVendedor, updateVendedor, deleteVendedor } from '@/lib/actions/vendedores'
import { Users, Plus, Phone, Mail, Trash2, Loader2, X, Check, Edit2, ShieldCheck, Lock } from 'lucide-react'
import { PERMISSOES as AREAS } from '@/lib/permissoes'

type Vendedor = {
  id: string; nome: string; telefone: string | null; email: string | null
  data_nascimento: string | null; cep: string | null; endereco: string | null
  numero: string | null; complemento: string | null; bairro: string | null
  cidade: string | null; uf: string | null; notes: string | null
  bloqueios: string[] | null; active: boolean
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export function VendedoresClient({ vendedores }: { vendedores: Vendedor[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Vendedor | null>(null)
  const [viewing, setViewing] = useState<Vendedor | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // permissões: conjunto de áreas que o vendedor PODE acessar
  const [podeAcessar, setPodeAcessar] = useState<Set<string>>(new Set(AREAS.map(a => a.key)))
  const formRef = useRef<HTMLFormElement>(null)

  function openNew() {
    setEditing(null)
    setPodeAcessar(new Set(AREAS.map(a => a.key)))
    setError(null); setModalOpen(true)
  }
  function openEdit(v: Vendedor) {
    setEditing(v)
    const bloq = new Set(v.bloqueios ?? [])
    setPodeAcessar(new Set(AREAS.filter(a => !bloq.has(a.key)).map(a => a.key)))
    setError(null); setModalOpen(true)
  }
  function togglePerm(key: string) {
    setPodeAcessar(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const fd = new FormData(formRef.current!)
    // bloqueios = áreas NÃO marcadas
    fd.set('bloqueios', AREAS.filter(a => !podeAcessar.has(a.key)).map(a => a.key).join(','))
    const result = editing ? await updateVendedor(editing.id, fd) : await createVendedor(fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setModalOpen(false); setEditing(null)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteVendedor(id)
    setDeletingId(null)
  }

  const inputCls = "w-full h-11 px-4 rounded-xl border border-[#EAE8E1] bg-[#F7F6F3] text-sm outline-none focus:border-[#1A56FF] transition-all placeholder:text-[#C8C5BB]"
  const labelCls = "text-[11px] font-bold text-[#2E2D29] uppercase tracking-wider block mb-1"

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>Vendedores</h2>
            <p className="text-sm text-[#8C8880] mt-0.5">Equipe de vendas e permissões de acesso</p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
            <Plus className="size-4" /> Novo Vendedor
          </button>
        </div>

        {vendedores.length === 0 ? (
          <GlowCard>
            <div className="p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <Users className="size-7 text-[#1A56FF]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#1C1B18]">Nenhum vendedor cadastrado</p>
                <p className="text-sm text-[#8C8880] mt-1">Cadastre sua equipe e defina o que cada um pode acessar.</p>
              </div>
              <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                <Plus className="size-4" /> Cadastrar vendedor
              </button>
            </div>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {vendedores.map((v, i) => {
              const nBloq = (v.bloqueios ?? []).length
              return (
                <GlowCard key={v.id}>
                  <div onClick={() => setViewing(v)} className="p-5 cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
                          style={{ background: i === 0 ? 'linear-gradient(135deg,#1A56FF,#0D3ACC)' : 'linear-gradient(135deg,#93AAFF,#1A56FF)' }}>
                          {v.nome[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1C1B18]">{v.nome}</p>
                          {v.telefone && <p className="text-xs text-[#8C8880] flex items-center gap-1 mt-0.5"><Phone className="size-3" /> {v.telefone}</p>}
                          {v.email && <p className="text-xs text-[#C8C5BB] flex items-center gap-1 mt-0.5"><Mail className="size-3" /> {v.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(v) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3] transition-colors">
                          <Edit2 className="size-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id) }} disabled={deletingId === v.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                          {deletingId === v.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${nBloq === 0 ? 'bg-[#E6F9F3] text-[#0DB57A]' : 'bg-[#FEF3C7] text-[#F59E0B]'}`}>
                      {nBloq === 0 ? <><ShieldCheck className="size-3" /> Acesso total</> : <><Lock className="size-3" /> {nBloq} área{nBloq > 1 ? 's' : ''} bloqueada{nBloq > 1 ? 's' : ''}</>}
                    </span>
                  </div>
                </GlowCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal visualizar permissões */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-[#EAE8E1]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white" style={{ background: 'linear-gradient(135deg,#1A56FF,#0D3ACC)' }}>
                  {viewing.nome[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>{viewing.nome}</p>
                  <p className="text-xs text-[#8C8880]">{[viewing.telefone, viewing.email].filter(Boolean).join(' · ') || 'Vendedor'}</p>
                </div>
              </div>
              <button onClick={() => setViewing(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C8880] hover:bg-[#F7F6F3]"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#1A56FF]" />
                <p className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider">Permissões de acesso</p>
              </div>
              <div className="space-y-2">
                {AREAS.map(a => {
                  const liberado = !(viewing.bloqueios ?? []).includes(a.key)
                  return (
                    <div key={a.key} className={`flex items-center justify-between px-3 h-11 rounded-xl border ${liberado ? 'bg-[#E6F9F3] border-[#0DB57A]/20' : 'bg-[#FEF2F2] border-red-100'}`}>
                      <span className="text-sm text-[#2E2D29]">{a.label}</span>
                      <span className={`flex items-center gap-1 text-xs font-bold ${liberado ? 'text-[#0DB57A]' : 'text-red-500'}`}>
                        {liberado ? <><Check className="size-3.5" strokeWidth={3} /> Liberado</> : <><Lock className="size-3" /> Bloqueado</>}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => { const v = viewing; setViewing(null); openEdit(v) }}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ fontFamily: 'Barlow, sans-serif', background: '#1A56FF', boxShadow: '0 4px 16px rgba(26,86,255,0.35)' }}>
                <Edit2 className="size-4" /> Editar Vendedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #0A0F1E, #1A56FF)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><Users className="size-4 text-white" strokeWidth={1.5} /></div>
                <p className="text-sm font-bold text-white">{editing ? 'Editar Vendedor' : 'Novo Vendedor'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white"><X className="size-5" /></button>
            </div>
            <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

              {/* Dados pessoais */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelCls}>Nome *</label><input name="nome" required defaultValue={editing?.nome ?? ''} placeholder="Nome completo" className={inputCls} /></div>
                <div><label className={labelCls}>WhatsApp</label><input name="telefone" defaultValue={editing?.telefone ?? ''} placeholder="85 99999-9999" className={inputCls} /></div>
                <div><label className={labelCls}>E-mail</label><input name="email" type="email" defaultValue={editing?.email ?? ''} placeholder="email@exemplo.com" className={inputCls} /></div>
                <div><label className={labelCls}>Nascimento</label><input name="data_nascimento" type="date" defaultValue={editing?.data_nascimento?.split('T')[0] ?? ''} className={inputCls} /></div>
                <div><label className={labelCls}>CEP</label><input name="cep" defaultValue={editing?.cep ?? ''} placeholder="00000-000" className={inputCls} /></div>
              </div>
              <div className="rounded-xl border border-[#EAE8E1] p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><label className={labelCls}>Endereço</label><input name="endereco" defaultValue={editing?.endereco ?? ''} placeholder="Rua, avenida..." className={inputCls} /></div>
                  <div><label className={labelCls}>Número</label><input name="numero" defaultValue={editing?.numero ?? ''} placeholder="123" className={inputCls} /></div>
                  <div><label className={labelCls}>Compl.</label><input name="complemento" defaultValue={editing?.complemento ?? ''} placeholder="Apto 4" className={inputCls} /></div>
                  <div><label className={labelCls}>Bairro</label><input name="bairro" defaultValue={editing?.bairro ?? ''} placeholder="Centro" className={inputCls} /></div>
                  <div><label className={labelCls}>Cidade</label><input name="cidade" defaultValue={editing?.cidade ?? ''} placeholder="Fortaleza" className={inputCls} /></div>
                </div>
                <div className="w-28"><label className={labelCls}>UF</label>
                  <select name="uf" defaultValue={editing?.uf ?? ''} className={inputCls}>
                    <option value="">--</option>{UFS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Permissões */}
              <div className="rounded-xl border border-[#EAE8E1] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#1A56FF]" />
                    <p className="text-xs font-bold text-[#2E2D29] uppercase tracking-wider">O que esse vendedor PODE acessar</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setPodeAcessar(new Set(AREAS.map(a => a.key)))}
                      className="text-[11px] font-semibold text-[#0DB57A] hover:underline">Marcar todos</button>
                    <span className="text-[#EAE8E1]">·</span>
                    <button type="button" onClick={() => setPodeAcessar(new Set())}
                      className="text-[11px] font-semibold text-[#8C8880] hover:underline">Limpar</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {AREAS.map(a => (
                    <button key={a.key} type="button" onClick={() => togglePerm(a.key)}
                      className="w-full flex items-center justify-between px-3 h-10 rounded-lg bg-[#F7F6F3] border border-[#EAE8E1] hover:border-[#1A56FF]/40 transition-colors">
                      <span className="text-sm text-[#2E2D29] text-left">{a.label}</span>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${podeAcessar.has(a.key) ? 'bg-[#0DB57A]' : 'bg-white border border-[#EAE8E1]'}`}>
                        {podeAcessar.has(a.key) && <Check className="size-3.5 text-white" strokeWidth={3} />}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#C8C5BB] mt-2">Verde = pode acessar. Desmarque o que ele NÃO deve ver.</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-xl border border-[#EAE8E1] text-sm font-semibold text-[#8C8880]">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: '#1A56FF', fontFamily: 'Barlow, sans-serif' }}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
