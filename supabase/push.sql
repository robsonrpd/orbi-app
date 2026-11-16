-- ============================================================
-- Notificação no celular/computador quando chega mensagem nova (Web Push)
--
-- Cada aparelho que ativa os avisos vira uma linha aqui (o "endereço" que o Apple/Google usam para entregar o
-- aviso). O webhook do WhatsApp manda um aviso para todos os aparelhos da loja. Endereço que o serviço de push
-- diz que morreu (aparelho desinstalou/negou) é apagado no próprio envio.
-- ============================================================

create table if not exists public.push_inscricoes (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid references public.users(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  aparelho        text,
  created_at      timestamptz not null default now(),
  ultimo_envio_em timestamptz
);
create index if not exists push_inscricoes_company_idx on public.push_inscricoes (company_id);

-- só o servidor lê/grava (RLS ligado e nenhuma policy)
alter table public.push_inscricoes enable row level security;
