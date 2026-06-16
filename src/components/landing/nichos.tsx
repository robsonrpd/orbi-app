'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'

const nichos = [
  {
    key: 'otica',
    emoji: '👓',
    label: 'Ótica',
    cor: '#1A56FF',
    corBg: '#EEF2FF',
    dor: 'Receitas em papel, laboratórios sem controle e clientes sem retorno — enquanto você perde vendas por falta de organização.',
    solucoes: [
      'O.S. digital com status em tempo real',
      'Receitas e prontuários por cliente',
      'Controle de laboratório e entregas',
      'Alerta automático de receitas vencendo',
    ],
  },
  {
    key: 'barbearia',
    emoji: '💈',
    label: 'Barbearia / Salão',
    cor: '#8B5CF6',
    corBg: '#F5F3FF',
    dor: 'Clientes ligam fora do horário, faltam sem avisar e a agenda vira uma bagunça impossível de gerenciar sozinho.',
    solucoes: [
      'Agendamento online 24h sem telefone',
      'IA confirma e lembra o cliente no WhatsApp',
      'Controle de comissão por profissional',
      'Fila de espera automática',
    ],
  },
  {
    key: 'loja',
    emoji: '🛍️',
    label: 'Loja / Varejo',
    cor: '#0DB57A',
    corBg: '#ECFDF5',
    dor: 'Vender sem saber o estoque real gera prejuízo. Crediário no caderno e caixa sem fechamento viram dívida oculta.',
    solucoes: [
      'PDV integrado ao estoque em tempo real',
      'Crediário digital com cobranças automáticas',
      'Produtos mais vendidos em um clique',
      'Fechamento de caixa com histórico',
    ],
  },
  {
    key: 'clinica',
    emoji: '🩺',
    label: 'Clínica / Estética',
    cor: '#F59E0B',
    corBg: '#FFFBEB',
    dor: 'Prontuários em papel, agenda cheia de conflitos e clientes que somem sem retorno — e você só descobre depois.',
    solucoes: [
      'Ficha digital completa de cada cliente',
      'Agenda com bloqueio de conflitos',
      'Lembretes automáticos de retorno',
      'Cobranças e recibos digitais',
    ],
  },
]

export function Nichos() {
  const [ativo, setAtivo] = useState(0)
  const n = nichos[ativo]

  return (
    <section id="nichos" className="py-14 sm:py-20 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <p className="text-xs font-bold tracking-[3px] uppercase text-[#1A56FF] mb-3" style={{ fontFamily: 'Barlow, sans-serif' }}>
            Feito para o seu ramo
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
            Um sistema, vários negócios
          </h2>
          <p className="mt-4 text-[#8C8880] leading-relaxed">
            Clique no seu ramo e veja como o Orbi resolve os problemas do seu dia a dia.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {nichos.map((item, i) => (
            <button
              key={item.key}
              onClick={() => setAtivo(i)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300"
              style={{
                background: ativo === i ? item.cor : item.corBg,
                color: ativo === i ? '#fff' : item.cor,
                boxShadow: ativo === i ? `0 8px 24px ${item.cor}40` : 'none',
                transform: ativo === i ? 'scale(1.05)' : 'scale(1)',
                fontFamily: 'Barlow, sans-serif',
              }}
            >
              <span className="text-xl">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Painel interativo */}
        <div
          key={n.key}
          className="mt-8 rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ background: n.corBg, border: `1.5px solid ${n.cor}25` }}
        >
          {/* Lado esquerdo — texto */}
          <div className="p-8 sm:p-10 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-2xl mb-4">
              <span>{n.emoji}</span>
              <span className="text-lg font-black" style={{ fontFamily: 'Fraunces, serif', color: n.cor }}>{n.label}</span>
            </div>

            <div className="rounded-2xl bg-white/70 border px-5 py-4 mb-6" style={{ borderColor: `${n.cor}30` }}>
              <p className="text-xs font-bold tracking-[2px] uppercase mb-2" style={{ fontFamily: 'Barlow, sans-serif', color: n.cor }}>
                O problema
              </p>
              <p className="text-[#2E2D29] text-sm leading-relaxed">{n.dor}</p>
            </div>

            <p className="text-xs font-bold tracking-[2px] uppercase mb-3" style={{ fontFamily: 'Barlow, sans-serif', color: n.cor }}>
              Como o Orbi resolve
            </p>
            <ul className="space-y-2.5 mb-8">
              {n.solucoes.map(s => (
                <li key={s} className="flex items-start gap-2.5 text-sm text-[#1C1B18]">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: n.cor }} strokeWidth={2} />
                  {s}
                </li>
              ))}
            </ul>

            <Link href="/cadastro"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white self-start transition-all active:scale-95"
              style={{ background: n.cor, boxShadow: `0 6px 20px ${n.cor}40`, fontFamily: 'Barlow, sans-serif' }}>
              Testar grátis para {n.label} <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Lado direito — preview do sistema */}
          <div className="relative flex items-end justify-center pt-8 px-6 overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{ background: `radial-gradient(ellipse at 60% 40%, ${n.cor} 0%, transparent 70%)` }}
            />
            <div className="relative rounded-t-2xl overflow-hidden shadow-2xl w-full max-w-md"
              style={{ border: `1.5px solid ${n.cor}30` }}>
              <Image
                src="/brand/dashboard-desktop.png"
                alt={`Painel Orbi para ${n.label}`}
                width={1586}
                height={992}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
